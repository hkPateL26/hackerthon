"""
Lightweight, CPU-Compatible ByteTrack Multi-Object Tracking Engine.
Phase: 8 — Object Tracking / Multi-Object Tracking
"""
import logging
from typing import Dict, List, Optional, Tuple

from src.detectors.yolo_detector import Detection
from src.tracking.track_state import TrackedObject, TrackStatus

logger = logging.getLogger("byte_tracker")


def compute_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """Calculates Intersection over Union (IoU) between two bounding boxes (x, y, w, h)."""
    x1_a, y1_a, w1_a, h1_a = box1
    x2_a, y2_a = x1_a + w1_a, y1_a + h1_a

    x1_b, y1_b, w1_b, h1_b = box2
    x2_b, y2_b = x1_b + w1_b, y1_b + h1_b

    inter_x1 = max(x1_a, x1_b)
    inter_y1 = max(y1_a, y1_b)
    inter_x2 = min(x2_a, x2_b)
    inter_y2 = min(y2_a, y2_b)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, w1_a * h1_a)
    area_b = max(0.0, w1_b * h1_b)
    union_area = area_a + area_b - inter_area

    if union_area <= 0.0:
        return 0.0
    return inter_area / union_area


class ByteTracker:
    """
    ByteTrack implementation for CPU-efficient multi-object tracking.
    
    Associates detections to tracks in two stages:
      1. First association: matches high-confidence detections with existing tracks.
      2. Second association: matches remaining tracks with low-confidence detections
         to recover occluded or motion-blurred objects without dropping the track ID.
    """

    def __init__(
        self,
        high_thresh: float = 0.45,
        low_thresh: float = 0.20,
        match_thresh: float = 0.35,
        max_lost_frames: int = 5,
    ):
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.match_thresh = match_thresh
        self.max_lost_frames = max_lost_frames

        self._next_track_id: int = 1
        self.tracks: Dict[int, TrackedObject] = {}

    def reset(self) -> None:
        """Clears all tracking state and resets ID allocation for a new session."""
        self._next_track_id = 1
        self.tracks.clear()

    def update(
        self,
        detections: List[Detection],
        timestamp: Optional[float] = None,
    ) -> List[TrackedObject]:
        """
        Updates the tracker with detections from the current video frame.
        Returns all currently active and valid tracks.
        """
        # 1. Partition detections into high and low confidence groups
        high_dets: List[Detection] = []
        low_dets: List[Detection] = []

        for det in detections:
            if det.confidence >= self.high_thresh:
                high_dets.append(det)
            elif det.confidence >= self.low_thresh:
                low_dets.append(det)

        # Separate pool of candidates: active or recently lost tracks
        candidate_track_ids = [
            tid for tid, trk in self.tracks.items()
            if trk.status in (TrackStatus.NEW, TrackStatus.ACTIVE, TrackStatus.LOST)
        ]

        # -------------------------------------------------------------
        # Stage 1: Associate high-confidence detections with existing tracks
        # -------------------------------------------------------------
        matched_tracks_stage1, unmatched_tracks_stage1, unmatched_high_dets = self._associate(
            candidate_track_ids, high_dets, self.match_thresh
        )

        for track_id, det in matched_tracks_stage1:
            self.tracks[track_id].update(
                bbox=det.bbox,
                confidence=det.confidence,
                detected_class=det.class_name,
                timestamp=timestamp,
            )

        # -------------------------------------------------------------
        # Stage 2: Associate remaining tracks with low-confidence detections
        # -------------------------------------------------------------
        matched_tracks_stage2, unmatched_tracks_stage2, _ = self._associate(
            unmatched_tracks_stage1, low_dets, self.match_thresh * 0.8
        )

        for track_id, det in matched_tracks_stage2:
            self.tracks[track_id].update(
                bbox=det.bbox,
                confidence=det.confidence,
                detected_class=det.class_name,
                timestamp=timestamp,
            )

        # -------------------------------------------------------------
        # Stage 3: Initiate new tracks from unmatched high-confidence detections
        # -------------------------------------------------------------
        for det in unmatched_high_dets:
            new_id = self._next_track_id
            self._next_track_id += 1
            new_track = TrackedObject(
                track_id=new_id,
                category=det.category,
                detected_class=det.class_name,
                bbox=det.bbox,
                confidence=det.confidence,
                timestamp=timestamp,
            )
            # High confidence detection activates immediately
            new_track.status = TrackStatus.ACTIVE
            self.tracks[new_id] = new_track

        # -------------------------------------------------------------
        # Stage 4: Mark missed tracks and terminate expired ones
        # -------------------------------------------------------------
        for track_id in unmatched_tracks_stage2:
            trk = self.tracks[track_id]
            trk.mark_missed()
            if trk.lost_frames > self.max_lost_frames:
                trk.terminate()

        # Clean up terminated tracks after grace period so they don't consume memory
        # Keep terminated tracks for 1 frame so callers can detect termination if needed
        to_delete = [
            tid for tid, trk in self.tracks.items()
            if trk.status == TrackStatus.TERMINATED and trk.lost_frames > (self.max_lost_frames + 1)
        ]
        for tid in to_delete:
            del self.tracks[tid]

        # Return all active tracks for current frame
        return [
            trk for trk in self.tracks.values()
            if trk.status in (TrackStatus.NEW, TrackStatus.ACTIVE)
        ]

    def _associate(
        self,
        track_ids: List[int],
        dets: List[Detection],
        threshold: float,
    ) -> Tuple[List[Tuple[int, Detection]], List[int], List[Detection]]:
        """
        Greedy bipartite matching based on IoU score and category equality.
        """
        if not track_ids or not dets:
            return [], list(track_ids), list(dets)

        # Calculate pairwise matches (score, track_id, det_idx)
        matches: List[Tuple[float, int, int]] = []
        for det_idx, det in enumerate(dets):
            for tid in track_ids:
                trk = self.tracks[tid]
                # Enforce same category matching (PERSON only matches PERSON, VEHICLE matches VEHICLE)
                if trk.category != det.category:
                    continue
                iou = compute_iou(trk.bbox, det.bbox)
                if iou >= threshold:
                    matches.append((iou, tid, det_idx))

        # Sort matches by IoU descending
        matches.sort(key=lambda x: x[0], reverse=True)

        matched_tracks: List[Tuple[int, Detection]] = []
        assigned_tids = set()
        assigned_dets = set()

        for score, tid, det_idx in matches:
            if tid in assigned_tids or det_idx in assigned_dets:
                continue
            assigned_tids.add(tid)
            assigned_dets.add(det_idx)
            matched_tracks.append((tid, dets[det_idx]))

        unmatched_tracks = [tid for tid in track_ids if tid not in assigned_tids]
        unmatched_dets = [det for idx, det in enumerate(dets) if idx not in assigned_dets]

        return matched_tracks, unmatched_tracks, unmatched_dets
