"""
Dedicated License Plate Localization Engine
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
import logging
from typing import Optional, Tuple
import cv2
import numpy as np
from .anpr_state import PlateLocalization

logger = logging.getLogger("anpr.plate_detector")


class PlateDetector:
    """
    Localizes license plate candidate regions within detected vehicles.
    Uses computer-vision morphology, edge density, and contour aspect ratio filtering,
    with geometric ROI fallback.
    """

    def __init__(
        self,
        min_aspect_ratio: float = 1.8,
        max_aspect_ratio: float = 5.5,
        min_area: int = 400,
        roi_top_pct: float = 0.50,
        roi_bottom_pct: float = 0.95,
        roi_left_pct: float = 0.10,
        roi_right_pct: float = 0.90,
    ):
        self.min_aspect_ratio = min_aspect_ratio
        self.max_aspect_ratio = max_aspect_ratio
        self.min_area = min_area
        self.roi_top_pct = roi_top_pct
        self.roi_bottom_pct = roi_bottom_pct
        self.roi_left_pct = roi_left_pct
        self.roi_right_pct = roi_right_pct

    def localize(
        self,
        frame: np.ndarray,
        vehicle_bbox: Tuple[float, float, float, float],
        vehicle_track_id: Optional[int] = None,
        vehicle_class: Optional[str] = None,
    ) -> Optional[PlateLocalization]:
        """
        Localizes license plate within vehicle bounding box in the frame.

        Args:
            frame: Full video frame (H, W, 3)
            vehicle_bbox: (vx, vy, vw, vh) in frame coordinates
            vehicle_track_id: Optional Track ID from ByteTrack
            vehicle_class: Vehicle class name ('car', 'bus', 'truck', 'motorcycle')

        Returns:
            PlateLocalization with plate crop and frame coordinates, or None if crop invalid.
        """
        frame_h, frame_w = frame.shape[:2]
        vx, vy, vw, vh = [int(v) for v in vehicle_bbox]

        # Clamp vehicle bbox to frame boundaries
        vx = max(0, min(vx, frame_w - 1))
        vy = max(0, min(vy, frame_h - 1))
        vw = max(10, min(vw, frame_w - vx))
        vh = max(10, min(vh, frame_h - vy))

        # Extract vehicle crop
        vehicle_crop = frame[vy:vy + vh, vx:vx + vw]
        if vehicle_crop.size == 0:
            return None

        # Restrict to lower-middle vehicle ROI where plates are mounted
        roi_y1 = int(vh * self.roi_top_pct)
        roi_y2 = int(vh * self.roi_bottom_pct)
        roi_x1 = int(vw * self.roi_left_pct)
        roi_x2 = int(vw * self.roi_right_pct)

        roi = vehicle_crop[roi_y1:roi_y2, roi_x1:roi_x2]
        if roi.size == 0:
            roi = vehicle_crop
            roi_y1, roi_x1 = 0, 0

        # Computer vision contour & edge candidate search
        best_candidate = self._find_contour_candidate(roi)

        if best_candidate is not None:
            cx, cy, cw, ch = best_candidate
            # Map back to frame coordinates
            plate_frame_x = vx + roi_x1 + cx
            plate_frame_y = vy + roi_y1 + cy
            plate_frame_w = cw
            plate_frame_h = ch
            confidence = 0.90
        else:
            # Deterministic geometric fallback: central lower third of vehicle
            fb_y1 = int(vh * 0.60)
            fb_y2 = int(vh * 0.92)
            fb_x1 = int(vw * 0.20)
            fb_x2 = int(vw * 0.80)
            plate_frame_x = vx + fb_x1
            plate_frame_y = vy + fb_y1
            plate_frame_w = max(20, fb_x2 - fb_x1)
            plate_frame_h = max(10, fb_y2 - fb_y1)
            confidence = 0.70

        # Clamp plate coordinates to frame
        plate_frame_x = max(0, min(plate_frame_x, frame_w - 1))
        plate_frame_y = max(0, min(plate_frame_y, frame_h - 1))
        plate_frame_w = max(10, min(plate_frame_w, frame_w - plate_frame_x))
        plate_frame_h = max(10, min(plate_frame_h, frame_h - plate_frame_y))

        plate_crop = frame[
            plate_frame_y:plate_frame_y + plate_frame_h,
            plate_frame_x:plate_frame_x + plate_frame_w,
        ]

        if plate_crop.size == 0:
            return None

        return PlateLocalization(
            crop=plate_crop,
            bbox=(float(plate_frame_x), float(plate_frame_y), float(plate_frame_w), float(plate_frame_h)),
            confidence=confidence,
            vehicle_track_id=vehicle_track_id,
            vehicle_class=vehicle_class,
        )

    def _find_contour_candidate(self, roi: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Applies morphological filtering and contour detection to locate rectangular plate candidate.
        """
        if roi.shape[0] < 15 or roi.shape[1] < 30:
            return None

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        # Sobel vertical edge filter (captures dense vertical character strokes)
        grad_x = cv2.Sobel(gray, cv2.CV_16S, 1, 0, ksize=3)
        abs_grad_x = cv2.convertScaleAbs(grad_x)

        # Morphological closing with horizontal rectangular kernel to connect characters
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
        closed = cv2.morphologyEx(abs_grad_x, cv2.MORPH_CLOSE, kernel)

        # Otsu thresholding
        _, thresh = cv2.threshold(closed, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Find external contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best_rect = None
        best_score = 0.0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < self.min_area:
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            if h == 0:
                continue

            aspect = float(w) / float(h)
            if self.min_aspect_ratio <= aspect <= self.max_aspect_ratio:
                # Prefer central candidates with typical plate aspect ~ 3.0 - 4.5
                ideal_aspect = 3.5
                aspect_score = 1.0 - abs(aspect - ideal_aspect) / ideal_aspect
                score = area * max(0.1, aspect_score)

                if score > best_score:
                    best_score = score
                    # Add 5% padding around candidate
                    pad_x = int(w * 0.05)
                    pad_y = int(h * 0.05)
                    px = max(0, x - pad_x)
                    py = max(0, y - pad_y)
                    pw = min(roi.shape[1] - px, w + 2 * pad_x)
                    ph = min(roi.shape[0] - py, h + 2 * pad_y)
                    best_rect = (px, py, pw, ph)

        return best_rect
