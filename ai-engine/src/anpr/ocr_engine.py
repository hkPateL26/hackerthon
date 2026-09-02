"""
CPU-Optimized OCR Engine using EasyOCR
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
import os
import logging
from typing import Optional, List
import numpy as np
import easyocr

from .anpr_state import OcrResult, ValidationStatus
from .preprocessor import PlatePreprocessor
from .plate_normalizer import validate_indian_plate, normalize_plate_text

logger = logging.getLogger("anpr.ocr_engine")

DEFAULT_MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
    "easyocr",
)


class OcrEngine:
    """
    CPU-optimized text recognizer wrapping EasyOCR.
    Processes localized plate crops directly using CRNN recognition without heavy CRAFT detector overhead.
    """

    def __init__(
        self,
        model_storage_dir: Optional[str] = None,
        confidence_threshold: float = 0.30,
    ):
        self.model_storage_dir = model_storage_dir or DEFAULT_MODEL_DIR
        os.makedirs(self.model_storage_dir, exist_ok=True)
        self.confidence_threshold = confidence_threshold
        self.preprocessor = PlatePreprocessor()

        logger.info(
            f"Initializing EasyOCR recognizer on CPU (model dir: {self.model_storage_dir})..."
        )
        try:
            self.reader = easyocr.Reader(
                ["en"],
                gpu=False,
                model_storage_directory=self.model_storage_dir,
                detector=False,
                recognizer=True,
                download_enabled=False,
                verbose=False,
            )
            logger.info("EasyOCR recognizer initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR recognizer: {e}")
            self.reader = None

    def recognize(self, plate_crop: np.ndarray) -> OcrResult:
        """
        Runs OCR on a localized plate crop image.

        Args:
            plate_crop: np.ndarray image of the license plate

        Returns:
            OcrResult with raw_text, normalized_text, confidence, and validation_status.
        """
        if self.reader is None or plate_crop is None or plate_crop.size == 0:
            return OcrResult(
                raw_text="",
                normalized_text="",
                confidence=0.0,
                validation_status=ValidationStatus.INVALID_FORMAT,
            )

        try:
            # 1. Primary Preprocessing
            processed = self.preprocessor.preprocess(plate_crop)

            # 2. Run EasyOCR recognition
            res = self._run_recognition(processed)

            # 3. Fallback preprocessing if initial recognition is weak
            if res.confidence < 0.40 or res.validation_status == ValidationStatus.INVALID_FORMAT:
                fallback_processed = self.preprocessor.fallback_preprocess(plate_crop)
                fallback_res = self._run_recognition(fallback_processed)
                if fallback_res.confidence > res.confidence:
                    res = fallback_res

            return res

        except Exception as e:
            logger.warning(f"OCR execution failed on crop: {e}")
            return OcrResult(
                raw_text="",
                normalized_text="",
                confidence=0.0,
                validation_status=ValidationStatus.INVALID_FORMAT,
            )

    def _run_recognition(self, image: np.ndarray) -> OcrResult:
        """Executes recognizer model on image array."""
        h, w = image.shape[:2]
        h_list = [[0, w, 0, h]]

        # Reader.recognize takes image and horizontal bounding box list
        raw_results = self.reader.recognize(
            image,
            horizontal_list=h_list,
            free_list=[],
        )

        if not raw_results:
            return OcrResult(
                raw_text="",
                normalized_text="",
                confidence=0.0,
                validation_status=ValidationStatus.INVALID_FORMAT,
            )

        texts: List[str] = []
        confidences: List[float] = []
        boxes: List[Any] = []

        for bbox, text, conf in raw_results:
            cleaned_token = text.strip()
            if cleaned_token:
                texts.append(cleaned_token)
                confidences.append(float(conf))
                boxes.append(bbox)

        raw_text = " ".join(texts)
        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        # Validate against Indian vehicle registration format
        val_status, normalized_text = validate_indian_plate(raw_text, avg_conf)

        return OcrResult(
            raw_text=raw_text,
            normalized_text=normalized_text,
            confidence=round(avg_conf, 4),
            validation_status=val_status,
            char_boxes=boxes,
        )
