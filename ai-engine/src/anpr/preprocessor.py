"""
License Plate Image Preprocessing
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
import cv2
import numpy as np


class PlatePreprocessor:
    """Deterministic image preprocessing pipeline for license plate crops."""

    def __init__(self, target_height: int = 70):
        self.target_height = target_height
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    def preprocess(self, crop: np.ndarray) -> np.ndarray:
        """
        Primary preprocessing pipeline:
        1. Dimension check & aspect ratio preservation
        2. Grayscale conversion
        3. Resize to optimal OCR height
        4. Bilateral filtering for edge-preserving denoising
        5. Contrast enhancement (CLAHE)
        """
        if crop is None or crop.size == 0:
            return crop

        # 1. Grayscale
        if len(crop.shape) == 3:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = crop.copy()

        # 2. Resize to standard height while preserving aspect ratio
        h, w = gray.shape[:2]
        if h > 0 and w > 0:
            aspect = w / float(h)
            new_w = max(int(self.target_height * aspect), 60)
            resized = cv2.resize(gray, (new_w, self.target_height), interpolation=cv2.INTER_CUBIC)
        else:
            resized = gray

        # 3. Bilateral filter: removes noise without blurring edges
        denoised = cv2.bilateralFilter(resized, d=7, sigmaColor=50, sigmaSpace=50)

        # 4. Contrast normalization (CLAHE)
        enhanced = self.clahe.apply(denoised)

        return enhanced

    def fallback_preprocess(self, crop: np.ndarray) -> np.ndarray:
        """
        Secondary fallback preprocessing:
        Applies Otsu thresholding / adaptive binarization if initial OCR confidence is low.
        """
        primary = self.preprocess(crop)
        if primary is None or primary.size == 0:
            return primary

        # Otsu thresholding
        _, binary = cv2.threshold(primary, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary
