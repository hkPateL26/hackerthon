"""
Unit tests for ByteTracker and TrackManager.
Phase: 8 — Object Tracking / Multi-Object Tracking
"""
import pytest
from src.detectors.yolo_detector import Detection
from src.tracking.byte_tracker import ByteTracker, compute_iou
from src.tracking.track_state import TrackStatus, TrackedObject
from src.tracking.track_manager import TrackManager


def create_det(bbox, confidence, category, class_name):
    return Detection(
        category=category,
        class_name=class_name,
        confidence=confidence,
        bbox=bbox,
        normalized_bbox=(0.1, 0.1, 0.2, 0.2),
        class_id=0 if category == "PERSON" else 2,
    )


def test_compute_iou():
    # Identical boxes
    box_a = (100.0, 100.0, 50.0, 50.0)
    assert compute_iou(box_a, box_a) == 1.0

    # Non-overlapping boxes
    box_b = (200.0, 200.0, 50.0, 50.0)
    assert compute_iou(box_a, box_b) == 0.0

    # Partially overlapping boxes
    # box_a: x: [100, 150], y: [100, 150], area = 2500
    # box_c: x: [125, 175], y: [100, 150], area = 2500
    # intersection: x: [125, 150] (25), y: [100, 150] (50), area = 1250
    # union = 2500 + 2500 - 1250 = 3750
    # IoU = 1250 / 3750 = 1/3 ~ 0.3333
    box_c = (125.0, 100.0, 50.0, 50.0)
    iou = compute_iou(box_a, box_c)
    assert pytest.approx(iou, 0.01) == 0.3333


def test_single_object_tracking_across_frames():
    tracker = ByteTracker(high_thresh=0.45, match_thresh=0.35, max_lost_frames=3)

    # Frame 1: Person appears
    det_f1 = [create_det(bbox=(100.0, 100.0, 50.0, 80.0), confidence=0.88, category="PERSON", class_name="person")]
    tracks_f1 = tracker.update(det_f1)
    assert len(tracks_f1) == 1
    track_id = tracks_f1[0].track_id
    assert track_id == 1
    assert tracks_f1[0].status == TrackStatus.ACTIVE

    # Frame 2: Person moves slightly (IoU high)
    det_f2 = [create_det(bbox=(105.0, 102.0, 50.0, 80.0), confidence=0.85, category="PERSON", class_name="person")]
    tracks_f2 = tracker.update(det_f2)
    assert len(tracks_f2) == 1
    assert tracks_f2[0].track_id == track_id  # SAME TRACK ID!
    assert tracks_f2[0].detection_count == 2
    assert tracks_f2[0].bbox == (105.0, 102.0, 50.0, 80.0)

    # Frame 3: Person moves further
    det_f3 = [create_det(bbox=(112.0, 104.0, 50.0, 80.0), confidence=0.82, category="PERSON", class_name="person")]
    tracks_f3 = tracker.update(det_f3)
    assert len(tracks_f3) == 1
    assert tracks_f3[0].track_id == track_id  # STABLE TRACK ID!
    assert tracks_f3[0].detection_count == 3


def test_multiple_simultaneous_objects_distinct_ids():
    tracker = ByteTracker(high_thresh=0.45, match_thresh=0.35)

    # Frame 1: 1 Person and 1 Vehicle
    dets_f1 = [
        create_det(bbox=(50.0, 100.0, 40.0, 70.0), confidence=0.90, category="PERSON", class_name="person"),
        create_det(bbox=(300.0, 150.0, 150.0, 100.0), confidence=0.85, category="VEHICLE", class_name="bus"),
    ]
    tracks_f1 = tracker.update(dets_f1)
    assert len(tracks_f1) == 2
    person_track = next(t for t in tracks_f1 if t.category == "PERSON")
    vehicle_track = next(t for t in tracks_f1 if t.category == "VEHICLE")
    assert person_track.track_id != vehicle_track.track_id

    # Frame 2: Both objects present and moved
    dets_f2 = [
        create_det(bbox=(54.0, 102.0, 40.0, 70.0), confidence=0.89, category="PERSON", class_name="person"),
        create_det(bbox=(305.0, 152.0, 150.0, 100.0), confidence=0.87, category="VEHICLE", class_name="bus"),
    ]
    tracks_f2 = tracker.update(dets_f2)
    assert len(tracks_f2) == 2
    person_f2 = next(t for t in tracks_f2 if t.category == "PERSON")
    vehicle_f2 = next(t for t in tracks_f2 if t.category == "VEHICLE")

    assert person_f2.track_id == person_track.track_id
    assert vehicle_f2.track_id == vehicle_track.track_id


def test_category_isolation_prevents_mismatch():
    """Even if bboxes overlap perfectly, PERSON and VEHICLE never match."""
    tracker = ByteTracker(high_thresh=0.45, match_thresh=0.35)

    # Frame 1: Person at (100, 100, 50, 50)
    tracker.update([create_det(bbox=(100.0, 100.0, 50.0, 50.0), confidence=0.90, category="PERSON", class_name="person")])

    # Frame 2: Vehicle at exact same position (100, 100, 50, 50)
    tracks_f2 = tracker.update([create_det(bbox=(100.0, 100.0, 50.0, 50.0), confidence=0.90, category="VEHICLE", class_name="car")])

    # Should create a NEW track ID for the vehicle, not hijack track #1
    assert len(tracks_f2) == 1
    assert tracks_f2[0].category == "VEHICLE"
    assert tracks_f2[0].track_id == 2


def test_temporary_missed_frame_and_recovery():
    tracker = ByteTracker(high_thresh=0.45, match_thresh=0.35, max_lost_frames=3)

    # Frame 1: Person visible
    tracker.update([create_det(bbox=(100.0, 100.0, 50.0, 80.0), confidence=0.90, category="PERSON", class_name="person")])
    assert tracker.tracks[1].status == TrackStatus.ACTIVE

    # Frame 2: Person missed / occluded (empty detection list)
    active_f2 = tracker.update([])
    assert len(active_f2) == 0  # No active tracks visible
    assert tracker.tracks[1].status == TrackStatus.LOST  # But track is preserved as LOST
    assert tracker.tracks[1].lost_frames == 1

    # Frame 3: Person reappears at similar coordinates
    active_f3 = tracker.update([create_det(bbox=(102.0, 101.0, 50.0, 80.0), confidence=0.88, category="PERSON", class_name="person")])
    assert len(active_f3) == 1
    assert active_f3[0].track_id == 1  # Recovered with same track ID!
    assert active_f3[0].status == TrackStatus.ACTIVE
    assert active_f3[0].lost_frames == 0


def test_track_termination_after_max_lost():
    tracker = ByteTracker(high_thresh=0.45, match_thresh=0.35, max_lost_frames=2)

    # Frame 1: Detected
    tracker.update([create_det(bbox=(100.0, 100.0, 50.0, 80.0), confidence=0.90, category="PERSON", class_name="person")])

    # Frame 2: Miss 1
    tracker.update([])
    assert tracker.tracks[1].status == TrackStatus.LOST

    # Frame 3: Miss 2
    tracker.update([])
    assert tracker.tracks[1].status == TrackStatus.LOST

    # Frame 4: Miss 3 (exceeds max_lost_frames=2)
    tracker.update([])
    assert tracker.tracks[1].status == TrackStatus.TERMINATED


def test_track_manager_isolation_and_snapshot():
    tm1 = TrackManager(camera_id="cam-1", session_id="sess-1")
    tm2 = TrackManager(camera_id="cam-2", session_id="sess-2")

    # Feed detection to tm1
    tm1.update([create_det(bbox=(10.0, 10.0, 20.0, 20.0), confidence=0.8, category="PERSON", class_name="person")])
    snap1 = tm1.get_active_tracks_snapshot()
    assert len(snap1) == 1
    assert snap1[0]["trackId"] == 1

    # tm2 should be completely empty and isolated
    assert len(tm2.get_active_tracks_snapshot()) == 0

    # Feed detection to tm2; it gets its own trackId = 1
    tm2.update([create_det(bbox=(50.0, 50.0, 30.0, 30.0), confidence=0.8, category="PERSON", class_name="person")])
    snap2 = tm2.get_active_tracks_snapshot()
    assert len(snap2) == 1
    assert snap2[0]["trackId"] == 1  # Session-scoped, so trackId 1 is valid in sess-2
