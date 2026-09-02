"""
E2E ANPR Frame Test on anpr-test-traffic.mp4
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai-engine"))
import cv2
from src.detectors.yolo_detector import YoloDetector
from src.anpr.plate_detector import PlateDetector
from src.anpr.ocr_engine import OcrEngine

video_path = os.path.join("sample-data", "videos", "anpr-test-traffic.mp4")
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, 10)
ret, frame = cap.read()
cap.release()

print("Frame read:", ret, frame.shape if frame is not None else None)

detector = YoloDetector()
dets = detector.detect(frame, confidence_threshold=0.3)
print("YOLO Detections:")
for d in dets:
    print(f"  [{d.category}] {d.class_name} conf={d.confidence:.2f} bbox={d.bbox}")

plate_detector = PlateDetector()
ocr = OcrEngine()

for d in dets:
    if d.category == "VEHICLE":
        loc = plate_detector.localize(frame, d.bbox, vehicle_class=d.class_name)
        if loc:
            print(f"Plate localized at bbox={loc.bbox} conf={loc.confidence}")
            res = ocr.recognize(loc.crop)
            print(f"OCR raw='{res.raw_text}' norm='{res.normalized_text}' conf={res.confidence} status={res.validation_status.value}")
