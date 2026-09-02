"""
AI Session Manager for managing camera inference workers, telemetry,
snapshot capture, and secure event dispatching to NestJS.
"""

import asyncio
import os
import time
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from pathlib import Path
import uuid
import cv2
import httpx

from src.config import settings
from src.detectors.yolo_detector import YoloDetector, Detection
from src.pipeline.frame_sampler import FrameSampler
from src.pipeline.deduplicator import EventDeduplicator
from src.tracking.track_manager import TrackManager
from src.anpr.anpr_manager import AnprManager

logger = logging.getLogger("SessionManager")


@dataclass
class SessionTelemetry:
    camera_id: str
    camera_code: str
    status: str  # "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "ERROR"
    sample_fps: float
    confidence_threshold: float
    processed_frames: int = 0
    detections_count: int = 0
    approx_fps: float = 0.0
    started_at: Optional[str] = None
    last_processed_at: Optional[str] = None
    error: Optional[str] = None


class CameraAiSession:
    def __init__(
        self,
        camera_id: str,
        camera_code: str,
        source_url: str,
        detector: YoloDetector,
        sample_fps: float = 1.5,
        confidence_threshold: float = 0.5,
    ):
        self.camera_id = camera_id
        self.camera_code = camera_code
        self.source_url = source_url
        self.detector = detector
        self.sample_fps = sample_fps
        self.confidence_threshold = confidence_threshold

        self.telemetry = SessionTelemetry(
            camera_id=camera_id,
            camera_code=camera_code,
            status="STARTING",
            sample_fps=sample_fps,
            confidence_threshold=confidence_threshold,
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

        self.sampler: Optional[FrameSampler] = None
        self.deduplicator = EventDeduplicator(iou_threshold=0.6, window_seconds=3.0)
        self.session_id: str = str(uuid.uuid4())
        self.track_manager = TrackManager(
            camera_id=camera_id,
            session_id=self.session_id,
            high_thresh=min(0.35, confidence_threshold),
            low_thresh=0.15,
            match_thresh=0.30,
        )
        self.anpr_manager = AnprManager(
            camera_id=camera_id,
            session_id=self.session_id,
        )
        self.is_running = False
        self.worker_task: Optional[asyncio.Task] = None
        self._http_client = httpx.AsyncClient(timeout=5.0)

    async def start(self) -> bool:
        """Starts the AI session worker loop."""
        self.sampler = FrameSampler(self.source_url, target_fps=self.sample_fps)
        if not self.sampler.start():
            self.telemetry.status = "ERROR"
            self.telemetry.error = f"Failed to open video source: {self.source_url}"
            return False

        self.is_running = True
        self.telemetry.status = "RUNNING"
        self.worker_task = asyncio.create_task(self._run_loop())
        logger.info(f"AI session started for camera {self.camera_code} ({self.camera_id}) with session_id {self.session_id}")
        return True

    async def _run_loop(self):
        """Main inference worker loop running on sampled frames."""
        frame_counter = 0
        t_start = time.time()

        while self.is_running:
            try:
                # 1. Read sampled frame (runs in thread pool to avoid blocking async event loop)
                ret, frame = await asyncio.to_thread(self.sampler.read_sampled_frame)
                if not ret or frame is None:
                    await asyncio.sleep(0.1)
                    continue

                frame_counter += 1
                self.telemetry.processed_frames = frame_counter
                now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                self.telemetry.last_processed_at = now_str

                # Calculate approximate inference FPS
                elapsed = time.time() - t_start
                if elapsed > 0:
                    self.telemetry.approx_fps = round(frame_counter / elapsed, 2)

                # 2. Run YOLOv8n inference on CPU
                detections = await asyncio.to_thread(
                    self.detector.detect,
                    frame,
                    self.confidence_threshold,
                )

                # 3. Multi-Object Tracking (ByteTrack)
                self.track_manager.update(detections)

                # 4. Process detections and emit events
                for det in detections:
                    track_id = self.track_manager.get_track_for_detection(det)

                    if self.deduplicator.should_emit(det):
                        self.telemetry.detections_count += 1
                        # Save snapshot JPEG to D: drive runtime/snapshots
                        snapshot_path = await self._save_snapshot(frame, det, track_id)
                        # Dispatch event to NestJS
                        await self._dispatch_event(frame, det, snapshot_path, track_id)

                    # 4b. Automatic Number Plate Recognition (ANPR) for VEHICLE category
                    if det.category == "VEHICLE":
                        try:
                            await self.anpr_manager.process_vehicle_async(
                                frame,
                                det.bbox,
                                det.confidence,
                                det.class_name,
                                track_id,
                            )
                        except Exception as anpr_err:
                            logger.warning(f"ANPR vehicle processing error: {anpr_err}")

                # 5. Periodically sync tracks to NestJS
                await self.track_manager.sync_to_backend()

            except Exception as e:
                logger.error(f"Error in inference loop for {self.camera_code}: {e}", exc_info=True)
                await asyncio.sleep(0.5)

        logger.info(f"Inference loop stopped for {self.camera_code}")

    async def _save_snapshot(self, frame, det: Detection, track_id: Optional[int] = None) -> Optional[str]:
        """Saves JPEG snapshot to D: drive runtime/snapshots."""
        try:
            timestamp = int(time.time() * 1000)
            filename = f"snap_{self.camera_id}_{timestamp}_{self.telemetry.detections_count}.jpg"
            target_path = Path(settings.SNAPSHOT_DIR) / filename

            # Draw lightweight box label on snapshot
            snap_img = frame.copy()
            x, y, w, h = [int(v) for v in det.bbox]
            color = (0, 255, 0) if det.category == "PERSON" else (0, 165, 255)
            cv2.rectangle(snap_img, (x, y), (x + w, y + h), color, 2)
            label = (
                f"{det.class_name} #{track_id} {int(det.confidence * 100)}%"
                if track_id is not None
                else f"{det.class_name} {int(det.confidence * 100)}%"
            )
            cv2.putText(
                snap_img,
                label,
                (x, max(20, y - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                2,
            )

            # Write file (asynchronously via thread)
            await asyncio.to_thread(cv2.imwrite, str(target_path), snap_img)
            return f"runtime/snapshots/{filename}"
        except Exception as e:
            logger.warn(f"Failed to generate snapshot: {e}")
            return None

    async def _dispatch_event(
        self,
        frame,
        det: Detection,
        snapshot_path: Optional[str],
        track_id: Optional[int] = None,
    ):
        """Dispatches structured event to NestJS backend with X-AI-Service-Key."""
        event_code = "PERSON_DETECTED" if det.category == "PERSON" else "VEHICLE_DETECTED"
        height, width = frame.shape[:2]

        payload = {
            "cameraId": self.camera_id,
            "eventTypeCode": event_code,
            "detectedCategory": det.category,
            "detectedClass": det.class_name,
            "confidence": det.confidence,
            "occurredAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "frameWidth": width,
            "frameHeight": height,
            "bboxX": det.bbox[0],
            "bboxY": det.bbox[1],
            "bboxWidth": det.bbox[2],
            "bboxHeight": det.bbox[3],
            "snapshotPath": snapshot_path,
            "source": "YOLOv8n",
            "trackId": track_id,
            "metadata": {
                "approxFps": self.telemetry.approx_fps,
                "cameraCode": self.camera_code,
                "sessionId": self.session_id,
            },
        }

        try:
            url = f"{settings.BACKEND_URL}/api/events/ingest"
            res = await self._http_client.post(
                url,
                json=payload,
                headers={"x-ai-service-key": settings.AI_SERVICE_KEY},
            )
            if res.status_code != 201:
                logger.warn(f"NestJS event ingestion returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Failed to dispatch event to NestJS: {e}")

    async def stop(self):
        """Stops the session and releases all resources."""
        self.telemetry.status = "STOPPING"
        self.is_running = False

        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
            self.worker_task = None

        if hasattr(self, "track_manager") and self.track_manager:
            try:
                await self.track_manager.close()
            except Exception as e:
                logger.warning(f"Error closing track manager: {e}")

        if hasattr(self, "anpr_manager") and self.anpr_manager:
            try:
                await self.anpr_manager.close()
            except Exception as e:
                logger.warning(f"Error closing ANPR manager: {e}")

        if self.sampler:
            self.sampler.stop()
            self.sampler = None

        await self._http_client.aclose()
        self.telemetry.status = "STOPPED"
        logger.info(f"AI session for camera {self.camera_code} stopped cleanly.")

    def get_active_tracks(self) -> Dict[str, Any]:
        """Returns runtime active tracks snapshot for this camera session."""
        return {
            "cameraId": self.camera_id,
            "sessionId": self.session_id,
            "activeTracks": self.track_manager.get_active_tracks_snapshot() if hasattr(self, "track_manager") else [],
        }


class SessionManager:
    def __init__(self):
        self.detector = YoloDetector(device=settings.AI_DEVICE)
        self.sessions: Dict[str, CameraAiSession] = {}

    def get_active_count(self) -> int:
        return sum(
            1
            for s in self.sessions.values()
            if s.telemetry.status in ("RUNNING", "STARTING")
        )

    async def start_session(
        self,
        camera_id: str,
        camera_code: str,
        source_url: str,
        sample_fps: float = 1.5,
        confidence_threshold: float = 0.5,
    ) -> SessionTelemetry:
        """Starts a new camera AI session enforcing capacity cap."""
        # 1. Check if session already running
        existing = self.sessions.get(camera_id)
        if existing and existing.telemetry.status == "RUNNING":
            logger.info(f"AI session already running for camera {camera_code}")
            return existing.telemetry

        # 2. Check capacity limit
        if self.get_active_count() >= settings.AI_MAX_CONCURRENT_STREAMS:
            raise RuntimeError(
                f"Maximum concurrent AI streams ({settings.AI_MAX_CONCURRENT_STREAMS}) reached"
            )

        # 3. Clean existing stopped session if any
        if existing:
            await existing.stop()

        # 4. Create and start session
        session = CameraAiSession(
            camera_id=camera_id,
            camera_code=camera_code,
            source_url=source_url,
            detector=self.detector,
            sample_fps=sample_fps,
            confidence_threshold=confidence_threshold,
        )
        self.sessions[camera_id] = session
        await session.start()

        return session.telemetry

    async def stop_session(self, camera_id: str) -> SessionTelemetry:
        """Stops an active camera AI session."""
        session = self.sessions.get(camera_id)
        if not session:
            return SessionTelemetry(
                camera_id=camera_id,
                camera_code="UNKNOWN",
                status="STOPPED",
                sample_fps=1.5,
                confidence_threshold=0.5,
            )

        await session.stop()
        return session.telemetry

    def get_session(self, camera_id: str) -> Optional[SessionTelemetry]:
        session = self.sessions.get(camera_id)
        return session.telemetry if session else None

    def list_sessions(self) -> List[SessionTelemetry]:
        return [s.telemetry for s in self.sessions.values()]

    def get_active_tracks(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Returns runtime active tracks for a camera if active session exists."""
        session = self.sessions.get(camera_id)
        if not session or not session.is_running:
            return None
        return session.get_active_tracks()

    async def stop_all(self):
        """Stops all active sessions cleanly."""
        logger.info("Stopping all AI sessions...")
        for session in list(self.sessions.values()):
            await session.stop()
        self.sessions.clear()
