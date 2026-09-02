"""
Track Manager per Camera Session.
Phase: 8 — Object Tracking / Multi-Object Tracking
"""
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional
import httpx

from src.config import settings
from src.detectors.yolo_detector import Detection
from src.tracking.byte_tracker import ByteTracker
from src.tracking.track_state import TrackedObject, TrackStatus

logger = logging.getLogger("track_manager")


class TrackManager:
    """
    Manages the tracking lifecycle, state synchronization, and runtime telemetry
    for a specific camera AI session.
    """

    def __init__(
        self,
        camera_id: str,
        session_id: str,
        backend_url: Optional[str] = None,
        service_key: Optional[str] = None,
        high_thresh: float = 0.45,
        low_thresh: float = 0.20,
        match_thresh: float = 0.35,
        max_lost_frames: int = 5,
    ):
        self.camera_id = camera_id
        self.session_id = session_id
        self.backend_url = backend_url or settings.BACKEND_URL
        self.service_key = service_key or settings.AI_SERVICE_KEY

        self.tracker = ByteTracker(
            high_thresh=high_thresh,
            low_thresh=low_thresh,
            match_thresh=match_thresh,
            max_lost_frames=max_lost_frames,
        )

        # Cache of recently updated tracks to synchronize with NestJS backend
        self._last_sync_time: float = 0.0
        self._sync_interval_sec: float = 1.0  # Sync to PostgreSQL every 1.0s to avoid flooding

    def update(
        self,
        detections: List[Detection],
        timestamp: Optional[float] = None,
    ) -> List[TrackedObject]:
        """
        Runs ByteTrack association on sampled detections.
        Returns all active tracks.
        """
        now = timestamp if timestamp is not None else time.time()
        active_tracks = self.tracker.update(detections, timestamp=now)
        return active_tracks

    def get_active_tracks_snapshot(self) -> List[Dict[str, Any]]:
        """Returns JSON-serializable list of all active tracks for runtime API."""
        return [
            trk.to_dict()
            for trk in self.tracker.tracks.values()
            if trk.status in (TrackStatus.NEW, TrackStatus.ACTIVE, TrackStatus.LOST, TrackStatus.TERMINATED)
        ]

    def get_track_for_detection(self, det: Detection) -> Optional[int]:
        """
        Finds the matching track ID for a given detection (by highest IoU).
        Useful for tagging Phase 7 detection events with track_id.
        """
        best_id: Optional[int] = None
        best_iou: float = 0.20

        for trk in self.tracker.tracks.values():
            if trk.category == det.category:
                from src.tracking.byte_tracker import compute_iou
                iou = compute_iou(trk.bbox, det.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_id = trk.track_id

        return best_id

    async def sync_to_backend(self, force: bool = False) -> None:
        """
        Asynchronously synchronizes updated tracks to the NestJS Backend.
        Only syncs periodically or on force (e.g. session end) to keep DB writes lightweight.
        """
        now = time.time()
        if not force and (now - self._last_sync_time) < self._sync_interval_sec:
            return

        self._last_sync_time = now
        active_and_lost = [
            trk for trk in self.tracker.tracks.values()
            if trk.status in (TrackStatus.NEW, TrackStatus.ACTIVE, TrackStatus.LOST, TrackStatus.TERMINATED)
        ]

        if not active_and_lost:
            return

        payload = {
            "cameraId": self.camera_id,
            "sessionId": self.session_id,
            "tracks": [
                {
                    "trackId": trk.track_id,
                    "category": trk.category,
                    "detectedClass": trk.detected_class,
                    "confidence": trk.confidence,
                    "bboxX": trk.bbox[0],
                    "bboxY": trk.bbox[1],
                    "bboxWidth": trk.bbox[2],
                    "bboxHeight": trk.bbox[3],
                    "status": trk.status.value,
                    "firstSeenAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(trk.first_seen_at)),
                    "lastSeenAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(trk.last_seen_at)),
                    "detectionCount": trk.detection_count,
                    "metadata": {"history": list(trk.history)},
                }
                for trk in active_and_lost
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(
                    f"{self.backend_url}/api/tracks/sync",
                    json=payload,
                    headers={"X-AI-Service-Key": self.service_key},
                )
                if res.status_code not in (200, 201):
                    logger.warning(f"Failed to sync tracks to backend: {res.status_code} {res.text}")
        except Exception as e:
            logger.debug(f"Error syncing tracks to backend: {e}")

    async def close(self) -> None:
        """Terminates all remaining active tracks and flushes final state to backend."""
        for trk in self.tracker.tracks.values():
            trk.terminate()
        await self.sync_to_backend(force=True)
        self.tracker.reset()
