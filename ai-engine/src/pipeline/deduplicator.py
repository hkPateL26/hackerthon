"""
Spatial and Temporal Event Deduplicator (Phase 7).
Suppresses duplicate event generation for identical objects in consecutive frames
without implementing full multi-object tracking.
"""

import time
from typing import Dict, List, Tuple
from src.detectors.yolo_detector import Detection


def calculate_iou(boxA: Tuple[float, float, float, float], boxB: Tuple[float, float, float, float]) -> float:
    """
    Computes Intersection over Union (IoU) of two bounding boxes (x, y, w, h).
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interWidth = max(0.0, xB - xA)
    interHeight = max(0.0, yB - yA)
    interArea = interWidth * interHeight

    areaA = boxA[2] * boxA[3]
    areaB = boxB[2] * boxB[3]
    unionArea = areaA + areaB - interArea

    if unionArea <= 0.0:
        return 0.0

    return interArea / unionArea


class EventDeduplicator:
    def __init__(self, iou_threshold: float = 0.6, window_seconds: float = 3.0):
        self.iou_threshold = iou_threshold
        self.window_seconds = window_seconds
        # Records: (category, class_name) -> list of (timestamp, bbox)
        self.recent_records: List[Tuple[float, str, Tuple[float, float, float, float]]] = []

    def should_emit(self, detection: Detection, now: float = None) -> bool:
        """
        Determines if a detection represents a new event or a duplicate.
        Returns True if the event should be emitted, False if duplicate.
        """
        if now is None:
            now = time.time()

        # 1. Prune records older than window_seconds
        self.recent_records = [
            (t, cat, bbox)
            for (t, cat, bbox) in self.recent_records
            if now - t <= self.window_seconds
        ]

        # 2. Check if detection overlaps significantly with recent detection of same category
        for t, cat, bbox in self.recent_records:
            if cat == detection.category:
                iou = calculate_iou(detection.bbox, bbox)
                if iou >= self.iou_threshold:
                    # Duplicate detected within window
                    return False

        # 3. New detection: record and emit
        self.recent_records.append((now, detection.category, detection.bbox))
        return True

    def reset(self):
        self.recent_records.clear()
