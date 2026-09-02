"""
YOLOv8n object detector for person and vehicle detection on CPU.
Strict class filtering and normalization to PERSON / VEHICLE.
"""

from dataclasses import dataclass
from typing import List, Optional
import os
import logging
from src.config import settings

logger = logging.getLogger("YoloDetector")

# Class ID mapping according to standard COCO 80 taxonomy
COCO_PERSON_CLASSES = {
    0: "person",
}

COCO_VEHICLE_CLASSES = {
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}


@dataclass
class Detection:
    category: str  # "PERSON" | "VEHICLE"
    class_name: str  # "person", "car", "bus", "truck", "motorcycle", "bicycle"
    confidence: float  # 0.0 - 1.0
    bbox: tuple  # (x, y, w, h) in pixels
    normalized_bbox: tuple  # (x, y, w, h) normalized to [0, 1]
    class_id: int


class YoloDetector:
    def __init__(self, model_path: Optional[str] = None, device: str = "cpu"):
        self.model_path = model_path or settings.AI_MODEL_PATH
        self.device = device
        self.model = None
        self._load_model()

    def _load_model(self):
        """Loads YOLOv8n model weights onto CPU."""
        if not os.path.exists(self.model_path):
            logger.warning(
                f"Model weights not found at {self.model_path}. Will attempt lazy load or download."
            )
            return

        try:
            from ultralytics import YOLO

            logger.info(f"Loading YOLOv8n model from {self.model_path} onto {self.device}...")
            self.model = YOLO(self.model_path)
            logger.info("YOLOv8n model loaded successfully.")
        except ImportError:
            logger.warning("ultralytics package not yet installed. YOLO inference will be unavailable until installed.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")

    def is_ready(self) -> bool:
        return self.model is not None

    def detect(
        self,
        frame,
        confidence_threshold: Optional[float] = None,
    ) -> List[Detection]:
        """
        Runs CPU inference on a single video frame.
        Filters strictly for PERSON and VEHICLE classes above threshold.
        """
        if self.model is None:
            self._load_model()

        threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.AI_CONFIDENCE_THRESHOLD
        )

        height, width = frame.shape[:2]

        results = self.model.predict(
            source=frame,
            conf=threshold,
            device=self.device,
            verbose=False,
        )

        detections: List[Detection] = []
        if not results or len(results) == 0:
            return detections

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return detections

        for box in boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())

            # Filter for supported classes only
            category = None
            class_name = None

            if cls_id in COCO_PERSON_CLASSES:
                category = "PERSON"
                class_name = COCO_PERSON_CLASSES[cls_id]
            elif cls_id in COCO_VEHICLE_CLASSES:
                category = "VEHICLE"
                class_name = COCO_VEHICLE_CLASSES[cls_id]
            else:
                # Unsupported category (dog, chair, traffic light, etc.) — strictly ignored
                continue

            # Bounding box in xywh format (center_x, center_y, width, height) or xyxy (x1, y1, x2, y2)
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy

            # Convert to top-left (x, y, w, h)
            bx = max(0.0, float(x1))
            by = max(0.0, float(y1))
            bw = max(1.0, float(x2 - x1))
            bh = max(1.0, float(y2 - y1))

            # Normalized coordinates (0.0 to 1.0)
            norm_x = round(bx / width, 4)
            norm_y = round(by / height, 4)
            norm_w = round(bw / width, 4)
            norm_h = round(bh / height, 4)

            detections.append(
                Detection(
                    category=category,
                    class_name=class_name,
                    confidence=round(conf, 4),
                    bbox=(round(bx, 2), round(by, 2), round(bw, 2), round(bh, 2)),
                    normalized_bbox=(norm_x, norm_y, norm_w, norm_h),
                    class_id=cls_id,
                )
            )

        return detections
