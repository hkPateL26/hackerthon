"""
ANPR Data Structures & State Management
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Tuple, List, Dict, Any
import numpy as np


class ValidationStatus(str, Enum):
    VALID = "VALID"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    INVALID_FORMAT = "INVALID_FORMAT"


@dataclass
class PlateLocalization:
    """Localized license plate candidate within a vehicle."""
    crop: np.ndarray
    bbox: Tuple[float, float, float, float]  # (x, y, w, h) in absolute frame coordinates
    confidence: float
    vehicle_track_id: Optional[int] = None
    vehicle_class: Optional[str] = None


@dataclass
class OcrResult:
    """Raw and processed output of OCR inference."""
    raw_text: str
    normalized_text: str
    confidence: float
    validation_status: ValidationStatus
    char_boxes: Optional[List[Any]] = None


@dataclass
class AnprObservation:
    """Consolidated ANPR observation ready for persistence & dispatch."""
    camera_id: str
    session_id: Optional[str]
    track_id: Optional[int]
    vehicle_class: Optional[str]
    plate_text_raw: str
    plate_text_normalized: str
    validation_status: ValidationStatus
    plate_detection_confidence: float
    ocr_confidence: float
    final_confidence: float
    plate_bbox: Tuple[float, float, float, float]
    plate_snapshot_path: Optional[str] = None
    vehicle_snapshot_path: Optional[str] = None
    occurred_at: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrackAnprState:
    """Per-track ANPR state tracking cooldown, deduplication, and confidence."""
    track_id: int
    last_ocr_timestamp: float = 0.0
    last_normalized_plate: Optional[str] = None
    best_confidence: float = 0.0
    detection_count: int = 0
