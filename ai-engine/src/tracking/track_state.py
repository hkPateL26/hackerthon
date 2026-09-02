"""
Track State Models for Multi-Object Tracking.
Phase: 8 — Object Tracking / Multi-Object Tracking
"""
from collections import deque
from enum import Enum
import time
from typing import Deque, Dict, Any, List, Optional, Tuple


class TrackStatus(str, Enum):
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    LOST = "LOST"
    TERMINATED = "TERMINATED"


class TrackedObject:
    """Represents an actively or recently tracked object within a camera session."""

    def __init__(
        self,
        track_id: int,
        category: str,
        detected_class: str,
        bbox: Tuple[float, float, float, float],
        confidence: float,
        timestamp: Optional[float] = None,
        max_history_len: int = 10,
    ):
        self.track_id: int = track_id
        self.category: str = category
        self.detected_class: str = detected_class
        self.bbox: Tuple[float, float, float, float] = (
            round(float(bbox[0]), 2),
            round(float(bbox[1]), 2),
            round(float(bbox[2]), 2),
            round(float(bbox[3]), 2),
        )
        self.confidence: float = round(float(confidence), 4)
        
        now = timestamp if timestamp is not None else time.time()
        self.first_seen_at: float = now
        self.last_seen_at: float = now
        self.detection_count: int = 1
        self.lost_frames: int = 0
        self.status: TrackStatus = TrackStatus.NEW

        # Bounded trajectory history: recent center points (center_x, center_y)
        self.history: Deque[Tuple[float, float]] = deque(maxlen=max_history_len)
        cx = self.bbox[0] + self.bbox[2] / 2.0
        cy = self.bbox[1] + self.bbox[3] / 2.0
        self.history.append((round(cx, 2), round(cy, 2)))

    def update(
        self,
        bbox: Tuple[float, float, float, float],
        confidence: float,
        detected_class: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> None:
        """Updates track with a new matched detection."""
        now = timestamp if timestamp is not None else time.time()
        self.bbox = (
            round(float(bbox[0]), 2),
            round(float(bbox[1]), 2),
            round(float(bbox[2]), 2),
            round(float(bbox[3]), 2),
        )
        self.confidence = round(float(confidence), 4)
        if detected_class:
            self.detected_class = detected_class
        self.last_seen_at = now
        self.detection_count += 1
        self.lost_frames = 0
        
        # Once a track receives its confirmation (or immediate if high conf), become ACTIVE
        self.status = TrackStatus.ACTIVE

        # Append center point
        cx = self.bbox[0] + self.bbox[2] / 2.0
        cy = self.bbox[1] + self.bbox[3] / 2.0
        self.history.append((round(cx, 2), round(cy, 2)))

    def mark_missed(self) -> None:
        """Increments lost frames and transitions to LOST or TERMINATED."""
        self.lost_frames += 1
        if self.status != TrackStatus.TERMINATED:
            self.status = TrackStatus.LOST

    def terminate(self) -> None:
        """Marks track as TERMINATED."""
        self.status = TrackStatus.TERMINATED

    def to_dict(self) -> Dict[str, Any]:
        """Converts track to standard JSON-serializable dictionary."""
        return {
            "trackId": self.track_id,
            "category": self.category,
            "detectedClass": self.detected_class,
            "confidence": self.confidence,
            "bbox": {
                "x": self.bbox[0],
                "y": self.bbox[1],
                "width": self.bbox[2],
                "height": self.bbox[3],
            },
            "status": self.status.value,
            "firstSeenAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.first_seen_at)),
            "lastSeenAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.last_seen_at)),
            "detectionCount": self.detection_count,
            "lostFrames": self.lost_frames,
            "history": list(self.history),
        }
