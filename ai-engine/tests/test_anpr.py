"""
Unit Tests for ANPR Module
Phase: 9 — ANPR / Automatic Number Plate Recognition
"""
import os
import cv2
import numpy as np
import pytest

from src.anpr.anpr_state import ValidationStatus, PlateLocalization
from src.anpr.plate_normalizer import (
    normalize_plate_text,
    validate_indian_plate,
    attempt_contextual_corrections,
)
from src.anpr.preprocessor import PlatePreprocessor
from src.anpr.plate_detector import PlateDetector
from src.anpr.ocr_engine import OcrEngine
from src.anpr.anpr_manager import AnprManager


def test_plate_normalization():
    assert normalize_plate_text("gj 01 ab 1234") == "GJ01AB1234"
    assert normalize_plate_text("GJ-03-ER-8899") == "GJ03ER8899"
    assert normalize_plate_text("  MH.12.CD.4567  ") == "MH12CD4567"
    assert normalize_plate_text("") == ""


def test_indian_plate_validation():
    # Valid Gujarat plate
    status, norm = validate_indian_plate("GJ01AB1234", confidence=0.85)
    assert status == ValidationStatus.VALID
    assert norm == "GJ01AB1234"

    # Valid Bharat series plate
    status, norm = validate_indian_plate("22BH1234AA", confidence=0.90)
    assert status == ValidationStatus.VALID
    assert norm == "22BH1234AA"

    # Contextual OCR correction: 'GJO1AB1234' (letter O in district digits -> 0)
    status, norm = validate_indian_plate("GJO1AB1234", confidence=0.88)
    assert status == ValidationStatus.VALID
    assert norm == "GJ01AB1234"

    # Valid format but low confidence (< 0.50)
    status, norm = validate_indian_plate("GJ01AB1234", confidence=0.35)
    assert status == ValidationStatus.LOW_CONFIDENCE
    assert norm == "GJ01AB1234"

    # Non-matching format preserved for auditability
    status, norm = validate_indian_plate("RANDOMTEXT99", confidence=0.75)
    assert status == ValidationStatus.INVALID_FORMAT
    assert norm == "RANDOMTEXT99"


def test_plate_preprocessor():
    preprocessor = PlatePreprocessor(target_height=70)
    img = np.random.randint(0, 255, (80, 200, 3), dtype=np.uint8)

    processed = preprocessor.preprocess(img)
    assert processed.shape[0] == 70
    assert len(processed.shape) == 2  # Grayscale
    assert processed.dtype == np.uint8

    fallback = preprocessor.fallback_preprocess(img)
    assert fallback.shape[0] == 70


def test_plate_detector_localization():
    detector = PlateDetector()
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)

    # Synthetic vehicle bounding box: x=200, y=300, w=400, h=300
    vehicle_bbox = (200.0, 300.0, 400.0, 300.0)

    # Draw synthetic plate rectangle inside lower vehicle area
    cv2.rectangle(frame, (320, 500), (480, 550), (255, 255, 255), -1)
    cv2.putText(frame, "GJ01AB1234", (330, 540), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)

    localization = detector.localize(frame, vehicle_bbox, vehicle_track_id=1, vehicle_class="car")
    assert localization is not None
    assert isinstance(localization, PlateLocalization)
    assert localization.crop.size > 0

    px, py, pw, ph = localization.bbox
    # Coordinates must remain inside frame boundaries
    assert 0 <= px < 1280
    assert 0 <= py < 720
    assert px + pw <= 1280
    assert py + ph <= 720
    assert localization.vehicle_track_id == 1


def test_ocr_engine_execution():
    ocr = OcrEngine()
    if ocr.reader is None:
        pytest.skip("EasyOCR reader not available")

    # Render clean test plate crop
    crop = np.full((70, 240, 3), 255, dtype=np.uint8)
    cv2.putText(crop, "GJ01AB1234", (10, 48), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 0), 3)

    res = ocr.recognize(crop)
    assert res is not None
    assert len(res.raw_text) > 0
    assert res.confidence > 0.40
    # Normalized text must resolve to valid plate
    assert "GJ" in res.normalized_text or "1234" in res.normalized_text


def test_anpr_manager_confidence_and_cooldown():
    manager = AnprManager(
        camera_id="test-cam-001",
        session_id="test-sess-001",
        sample_interval=1.0,
        track_cooldown=3.0,
    )

    # Confidence formula verification: 0.25 * 0.90 + 0.35 * 0.90 + 0.40 * 0.90 = 0.90
    conf = manager.calculate_final_confidence(0.90, 0.90, 0.90)
    assert conf == 0.90

    # Test cooldown
    now = 1000.0
    assert manager.should_process_track(track_id=1, now=now) is True

    manager.last_sample_time = now
    from src.anpr.anpr_state import TrackAnprState
    manager.track_states[1] = TrackAnprState(track_id=1, last_ocr_timestamp=now)

    # 1 second later: rejected by track cooldown (3s)
    assert manager.should_process_track(track_id=1, now=now + 1.0) is False

    # 4 seconds later: accepted
    assert manager.should_process_track(track_id=1, now=now + 4.0) is True
