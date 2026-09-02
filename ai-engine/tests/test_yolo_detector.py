"""
Unit tests for YOLO class mapping, EventDeduplicator, FrameSampler, and AI routes.
Phase 7 — AI Video Analytics (Person & Vehicle Detection).
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.detectors.yolo_detector import (
    COCO_PERSON_CLASSES,
    COCO_VEHICLE_CLASSES,
    Detection,
)
from src.pipeline.deduplicator import EventDeduplicator, calculate_iou
from src.pipeline.frame_sampler import FrameSampler
from src.config import settings
from main import app

client = TestClient(app)


class TestYoloClassMapping:
    """Verify COCO classes are strictly normalized to PERSON and VEHICLE."""

    def test_person_class_mapping(self):
        assert 0 in COCO_PERSON_CLASSES
        assert COCO_PERSON_CLASSES[0] == "person"

    def test_vehicle_classes_mapping(self):
        expected = {
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck",
        }
        for class_id, class_name in expected.items():
            assert class_id in COCO_VEHICLE_CLASSES
            assert COCO_VEHICLE_CLASSES[class_id] == class_name

    def test_unsupported_classes_excluded(self):
        # COCO classes for animals or household items must not be in person/vehicle
        unsupported = [14, 15, 16, 56, 62]  # bird, cat, dog, chair, tv
        for uid in unsupported:
            assert uid not in COCO_PERSON_CLASSES
            assert uid not in COCO_VEHICLE_CLASSES


class TestEventDeduplication:
    """Verify spatial/temporal deduplication logic without ByteTrack."""

    def test_iou_calculation(self):
        boxA = (10.0, 10.0, 50.0, 50.0)
        boxB = (10.0, 10.0, 50.0, 50.0)
        # Identical boxes should have IoU = 1.0
        assert round(calculate_iou(boxA, boxB), 2) == 1.0

        # Disjoint boxes should have IoU = 0.0
        boxC = (100.0, 100.0, 50.0, 50.0)
        assert calculate_iou(boxA, boxC) == 0.0

        # Partially overlapping boxes
        boxD = (35.0, 10.0, 50.0, 50.0)  # overlap width 25
        iou = calculate_iou(boxA, boxD)
        assert 0.2 < iou < 0.5

    def test_deduplicator_suppresses_rapid_duplicates(self):
        dedup = EventDeduplicator(iou_threshold=0.6, window_seconds=3.0)

        det1 = Detection(
            category="PERSON",
            class_name="person",
            confidence=0.88,
            bbox=(100.0, 100.0, 60.0, 140.0),
            normalized_bbox=(0.15, 0.25, 0.1, 0.4),
            class_id=0,
        )

        t0 = 1000.0
        # First detection: must emit
        assert dedup.should_emit(det1, now=t0) is True

        # Duplicate detection (same category, almost same bbox, 1 sec later): must suppress
        det2 = Detection(
            category="PERSON",
            class_name="person",
            confidence=0.89,
            bbox=(102.0, 101.0, 60.0, 140.0),
            normalized_bbox=(0.15, 0.25, 0.1, 0.4),
            class_id=0,
        )
        assert dedup.should_emit(det2, now=t0 + 1.0) is False

        # Different category at same location: must emit
        det3 = Detection(
            category="VEHICLE",
            class_name="car",
            confidence=0.91,
            bbox=(100.0, 100.0, 60.0, 140.0),
            normalized_bbox=(0.15, 0.25, 0.1, 0.4),
            class_id=2,
        )
        assert dedup.should_emit(det3, now=t0 + 1.5) is True

        # Same person detection after 3.5 seconds: must emit (new event after window)
        assert dedup.should_emit(det1, now=t0 + 3.5) is True


class TestFrameSampler:
    """Verify frame sampler configuration."""

    def test_sampler_interval_calculation(self):
        sampler = FrameSampler("dummy.mp4", target_fps=1.5)
        assert round(sampler.frame_interval, 3) == round(1.0 / 1.5, 3)

        # Clamping
        fast_sampler = FrameSampler("dummy.mp4", target_fps=30.0)
        assert fast_sampler.target_fps <= 10.0


class TestAiSecurityAndRoutes:
    """Verify service-to-service key security on AI routes."""

    def test_session_routes_require_service_key(self):
        # Missing key -> 401
        res = client.get("/api/ai/sessions")
        assert res.status_code == 401

        # Invalid key -> 401
        res = client.get(
            "/api/ai/sessions",
            headers={"x-ai-service-key": "invalid-wrong-key"},
        )
        assert res.status_code == 401

    def test_session_routes_accept_valid_key(self):
        # Valid key -> 200
        res = client.get(
            "/api/ai/sessions",
            headers={"x-ai-service-key": settings.AI_SERVICE_KEY},
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)
