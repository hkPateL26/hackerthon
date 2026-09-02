"""
ANPR Pipeline Manager
Orchestrates plate localization, OCR, cooldowns, deduplication, snapshot storage, and NestJS sync.
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
import os
import time
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, List, Tuple
import cv2
import numpy as np
import httpx

from .anpr_state import (
    PlateLocalization,
    OcrResult,
    AnprObservation,
    TrackAnprState,
    ValidationStatus,
)
from .plate_detector import PlateDetector
from .ocr_engine import OcrEngine

logger = logging.getLogger("anpr.manager")

# Configurable defaults
DEFAULT_SAMPLE_INTERVAL = float(os.getenv("ANPR_SAMPLE_INTERVAL_SECONDS", "2.0"))
DEFAULT_TRACK_COOLDOWN = float(os.getenv("ANPR_TRACK_COOLDOWN_SECONDS", "5.0"))


class AnprManager:
    """
    Session-scoped ANPR manager coordinating plate detection, OCR recognition,
    per-track cooldowns, snapshot persistence, and backend synchronization.
    """

    def __init__(
        self,
        camera_id: str,
        session_id: Optional[str] = None,
        backend_url: Optional[str] = None,
        service_key: Optional[str] = None,
        sample_interval: float = DEFAULT_SAMPLE_INTERVAL,
        track_cooldown: float = DEFAULT_TRACK_COOLDOWN,
        runtime_base_dir: Optional[str] = None,
    ):
        self.camera_id = camera_id
        self.session_id = session_id
        self.backend_url = (backend_url or os.getenv("BACKEND_URL", "http://localhost:3000")).rstrip("/")
        self.service_key = service_key or os.getenv("AI_SERVICE_KEY", "dev-ai-service-key-change-in-production")
        self.sample_interval = sample_interval
        self.track_cooldown = track_cooldown

        # Base snapshot storage on D: drive
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.runtime_base_dir = runtime_base_dir or os.path.join(project_root, "runtime", "anpr")
        self.plates_dir = os.path.join(self.runtime_base_dir, "plates")
        self.vehicles_dir = os.path.join(self.runtime_base_dir, "vehicles")
        os.makedirs(self.plates_dir, exist_ok=True)
        os.makedirs(self.vehicles_dir, exist_ok=True)

        self.plate_detector = PlateDetector()
        self.ocr_engine = OcrEngine()

        self.track_states: Dict[int, TrackAnprState] = {}
        self.last_sample_time: float = 0.0

        # Stats
        self.total_vehicles_processed: int = 0
        self.total_candidates_found: int = 0
        self.total_ocr_attempts: int = 0
        self.total_plates_recognized: int = 0

        self.http_client = httpx.AsyncClient(timeout=4.0)

    def should_process_track(self, track_id: Optional[int], now: float) -> bool:
        """
        Enforces sampling rate and per-track cooldowns:
        - Overall sample interval (default: 2.0s)
        - Per-track cooldown (default: 5.0s)
        """
        if now - self.last_sample_time < self.sample_interval:
            return False

        if track_id is not None:
            state = self.track_states.get(track_id)
            if state and (now - state.last_ocr_timestamp) < self.track_cooldown:
                return False

        return True

    def calculate_final_confidence(
        self,
        vehicle_conf: float,
        plate_conf: float,
        ocr_conf: float,
    ) -> float:
        """
        Documented Confidence Formula:
        final_confidence = (0.25 * vehicle_conf) + (0.35 * plate_conf) + (0.40 * ocr_conf)
        Bounded in [0.0, 1.0].
        """
        raw = (0.25 * vehicle_conf) + (0.35 * plate_conf) + (0.40 * ocr_conf)
        return round(float(np.clip(raw, 0.0, 1.0)), 4)

    def process_vehicle(
        self,
        frame: np.ndarray,
        vehicle_bbox: Tuple[float, float, float, float],
        vehicle_confidence: float,
        vehicle_class: str,
        track_id: Optional[int] = None,
    ) -> Optional[AnprObservation]:
        """
        Executes ANPR pipeline for a detected vehicle.
        Safe execution: failures are logged and returned as None without stopping the session.
        """
        now = time.time()
        self.total_vehicles_processed += 1

        if not self.should_process_track(track_id, now):
            return None

        self.last_sample_time = now

        try:
            # 1. Plate candidate localization
            localization = self.plate_detector.localize(
                frame=frame,
                vehicle_bbox=vehicle_bbox,
                vehicle_track_id=track_id,
                vehicle_class=vehicle_class,
            )

            if localization is None:
                return None

            self.total_candidates_found += 1
            self.total_ocr_attempts += 1

            # 2. OCR Inference on localized plate crop
            ocr_res = self.ocr_engine.recognize(localization.crop)

            if not ocr_res.raw_text or not ocr_res.normalized_text:
                return None

            self.total_plates_recognized += 1

            # 3. Final confidence calculation
            final_conf = self.calculate_final_confidence(
                vehicle_conf=vehicle_confidence,
                plate_conf=localization.confidence,
                ocr_conf=ocr_res.confidence,
            )

            # 4. Save snapshots to D: drive
            ts_millis = int(now * 1000)
            track_tag = f"trk_{track_id}" if track_id is not None else "notrk"

            plate_filename = f"plate_{self.camera_id}_{ts_millis}_{track_tag}.jpg"
            plate_full_path = os.path.join(self.plates_dir, plate_filename)
            cv2.imwrite(plate_full_path, localization.crop)
            plate_rel_path = f"runtime/anpr/plates/{plate_filename}"

            # Save vehicle snapshot
            vx, vy, vw, vh = [int(v) for v in vehicle_bbox]
            vh_crop = frame[max(0, vy):max(0, vy + vh), max(0, vx):max(0, vx + vw)]
            vehicle_rel_path = None
            if vh_crop.size > 0:
                veh_filename = f"veh_{self.camera_id}_{ts_millis}_{track_tag}.jpg"
                veh_full_path = os.path.join(self.vehicles_dir, veh_filename)
                cv2.imwrite(veh_full_path, vh_crop)
                vehicle_rel_path = f"runtime/anpr/vehicles/{veh_filename}"

            # 5. Build observation record
            occurred_iso = datetime.now(timezone.utc).isoformat()
            observation = AnprObservation(
                camera_id=self.camera_id,
                session_id=self.session_id,
                track_id=track_id,
                vehicle_class=vehicle_class,
                plate_text_raw=ocr_res.raw_text,
                plate_text_normalized=ocr_res.normalized_text,
                validation_status=ocr_res.validation_status,
                plate_detection_confidence=localization.confidence,
                ocr_confidence=ocr_res.confidence,
                final_confidence=final_conf,
                plate_bbox=localization.bbox,
                plate_snapshot_path=plate_rel_path,
                vehicle_snapshot_path=vehicle_rel_path,
                occurred_at=occurred_iso,
                metadata={
                    "vehicle_confidence": round(vehicle_confidence, 4),
                    "vehicle_bbox": list(vehicle_bbox),
                },
            )

            # 6. Update per-track state
            if track_id is not None:
                track_state = self.track_states.setdefault(track_id, TrackAnprState(track_id=track_id))
                track_state.last_ocr_timestamp = now
                track_state.last_normalized_plate = ocr_res.normalized_text
                track_state.best_confidence = max(track_state.best_confidence, final_conf)
                track_state.detection_count += 1

            # 7. Asynchronously synchronize with NestJS backend
            asyncio.create_task(self.sync_to_backend([observation]))

            logger.info(
                f"[ANPR] Recognized plate '{ocr_res.normalized_text}' (raw: '{ocr_res.raw_text}') "
                f"status={ocr_res.validation_status.value} conf={final_conf:.2f} "
                f"track=#{track_id} cam={self.camera_id}"
            )

            return observation

        except Exception as e:
            logger.warning(f"ANPR processing error on vehicle: {e}", exc_info=False)
            return None

    async def sync_to_backend(self, observations: List[AnprObservation]) -> bool:
        """Dispatches ANPR observations to NestJS backend POST /api/anpr/sync."""
        if not observations:
            return True

        url = f"{self.backend_url}/api/anpr/sync"
        headers = {
            "Content-Type": "application/json",
            "X-AI-Service-Key": self.service_key,
        }

        payload = {
            "cameraId": self.camera_id,
            "sessionId": self.session_id,
            "observations": [
                {
                    "cameraId": obs.camera_id,
                    "sessionId": obs.session_id,
                    "trackId": obs.track_id,
                    "vehicleClass": obs.vehicle_class,
                    "plateTextRaw": obs.plate_text_raw,
                    "plateTextNormalized": obs.plate_text_normalized,
                    "validationStatus": obs.validation_status.value,
                    "plateDetectionConfidence": obs.plate_detection_confidence,
                    "ocrConfidence": obs.ocr_confidence,
                    "finalConfidence": obs.final_confidence,
                    "plateBboxX": obs.plate_bbox[0],
                    "plateBboxY": obs.plate_bbox[1],
                    "plateBboxWidth": obs.plate_bbox[2],
                    "plateBboxHeight": obs.plate_bbox[3],
                    "plateSnapshotPath": obs.plate_snapshot_path,
                    "vehicleSnapshotPath": obs.vehicle_snapshot_path,
                    "occurredAt": obs.occurred_at,
                    "metadata": obs.metadata,
                }
                for obs in observations
            ],
        }

        try:
            resp = await self.http_client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                logger.debug(f"Synced {len(observations)} ANPR records to backend")
                return True
            else:
                logger.warning(f"Failed to sync ANPR to backend: {resp.status_code} {resp.text}")
                return False
        except Exception as e:
            logger.warning(f"Error connecting to backend for ANPR sync: {e}")
            return False

    async def close(self):
        """Clean teardown of ANPR manager resources."""
        self.track_states.clear()
        await self.http_client.aclose()
        logger.info(f"ANPR Manager closed for camera {self.camera_id}")
