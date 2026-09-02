"""
Frame sampler for reading video streams via OpenCV at controlled FPS.
Handles stream looping, frame timing, and clean release.
"""

import time
import logging
from typing import Optional, Tuple
import cv2

logger = logging.getLogger("FrameSampler")


class FrameSampler:
    def __init__(self, source_url: str, target_fps: float = 1.5):
        self.source_url = source_url
        self.target_fps = max(0.2, min(10.0, target_fps))
        self.frame_interval = 1.0 / self.target_fps
        self.cap: Optional[cv2.VideoCapture] = None
        self.last_frame_time = 0.0
        self.is_running = False

    def start(self) -> bool:
        """Initializes OpenCV video capture."""
        logger.info(f"Opening video capture on source: {self.source_url} at {self.target_fps} FPS")
        self.cap = cv2.VideoCapture(self.source_url)
        if not self.cap.isOpened():
            logger.error(f"Failed to open video source: {self.source_url}")
            return False

        self.is_running = True
        self.last_frame_time = 0.0
        return True

    def read_sampled_frame(self) -> Tuple[bool, Optional[any]]:
        """
        Reads next frame respecting the target sampling rate.
        Loops video if end of file is reached.
        """
        if not self.cap or not self.is_running:
            return False, None

        now = time.time()
        elapsed = now - self.last_frame_time

        # Sleep/delay if called faster than sample rate
        if elapsed < self.frame_interval:
            time.sleep(self.frame_interval - elapsed)

        ret, frame = self.cap.read()

        if not ret:
            # Reached EOF (looping file source)
            logger.debug("Reached EOF on video source, rewinding to beginning...")
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Could not rewind video stream, attempting re-open...")
                self.cap.release()
                self.cap = cv2.VideoCapture(self.source_url)
                ret, frame = self.cap.read()

        if ret and frame is not None:
            self.last_frame_time = time.time()
            return True, frame

        return False, None

    def stop(self):
        """Releases video capture resources."""
        self.is_running = False
        if self.cap:
            try:
                self.cap.release()
            except Exception as e:
                logger.warn(f"Error releasing VideoCapture: {e}")
            self.cap = None
        logger.info(f"VideoCapture for {self.source_url} released cleanly.")
