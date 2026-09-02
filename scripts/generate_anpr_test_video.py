"""
Generate Dedicated ANPR Test Video: anpr-test-traffic.mp4
Creates a 1280x720 video of a moving car with an Indian license plate (GJ01AB1234).
Ensures COCO visual car features so YOLOv8n reliably classifies it as a 'car'
and EasyOCR reads the real image pixels of the license plate.
"""
import os
import cv2
import numpy as np

OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "sample-data",
    "videos",
)
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "anpr-test-traffic.mp4")

WIDTH = 1280
HEIGHT = 720
FPS = 25
NUM_FRAMES = 100  # 4 seconds


def draw_road(img):
    # Road background
    cv2.rectangle(img, (0, 350), (WIDTH, HEIGHT), (60, 60, 60), -1)
    # Road curb / background
    cv2.rectangle(img, (0, 0), (WIDTH, 350), (120, 140, 150), -1)
    # White road lane markings
    for x in range(0, WIDTH, 120):
        cv2.rectangle(img, (x, 520), (x + 60, 535), (255, 255, 255), -1)


def draw_realistic_car(img, car_x, car_y, car_w, car_h):
    """
    Renders a realistic front-facing sedan car:
    - Main body with aerodynamic curvature
    - Windshield and roof
    - Headlights (warm white/yellow with chrome bezel)
    - Front grill (dark honeycomb / slats)
    - Front bumper
    - Wheels / tires
    - Front license plate with standard Indian font & colors
    """
    # 1. Shadow underneath
    cv2.ellipse(
        img,
        (car_x + car_w // 2, car_y + car_h - 10),
        (car_w // 2 + 20, 25),
        0, 0, 360,
        (25, 25, 25),
        -1,
    )

    # 2. Tires
    tire_w = int(car_w * 0.16)
    tire_h = int(car_h * 0.35)
    # Left tire
    cv2.rectangle(img, (car_x + 10, car_y + car_h - tire_h), (car_x + 10 + tire_w, car_y + car_h), (20, 20, 20), -1)
    # Right tire
    cv2.rectangle(img, (car_x + car_w - 10 - tire_w, car_y + car_h - tire_h), (car_x + car_w - 10, car_y + car_h), (20, 20, 20), -1)

    # 3. Main Car Lower Body (Sleek Dark Blue Sedan)
    body_color = (130, 45, 25)  # BGR: Dark Blue
    body_pts = np.array([
        [car_x + 15, car_y + int(car_h * 0.45)],
        [car_x + car_w - 15, car_y + int(car_h * 0.45)],
        [car_x + car_w - 5, car_y + int(car_h * 0.85)],
        [car_x + car_w - 20, car_y + int(car_h * 0.95)],
        [car_x + 20, car_y + int(car_h * 0.95)],
        [car_x + 5, car_y + int(car_h * 0.85)],
    ], dtype=np.int32)
    cv2.fillPoly(img, [body_pts], body_color)
    cv2.polylines(img, [body_pts], True, (40, 15, 10), 3)

    # 4. Cabin & Windshield
    cabin_pts = np.array([
        [car_x + int(car_w * 0.18), car_y + int(car_h * 0.45)],
        [car_x + int(car_w * 0.26), car_y + 10],
        [car_x + int(car_w * 0.74), car_y + 10],
        [car_x + int(car_w * 0.82), car_y + int(car_h * 0.45)],
    ], dtype=np.int32)
    # Roof/pillars
    cv2.fillPoly(img, [cabin_pts], (100, 35, 20))
    # Windshield glass (tinted light cyan/grey)
    windshield_pts = np.array([
        [car_x + int(car_w * 0.22), car_y + int(car_h * 0.43)],
        [car_x + int(car_w * 0.29), car_y + 20],
        [car_x + int(car_w * 0.71), car_y + 20],
        [car_x + int(car_w * 0.78), car_y + int(car_h * 0.43)],
    ], dtype=np.int32)
    cv2.fillPoly(img, [windshield_pts], (180, 170, 150))
    cv2.polylines(img, [windshield_pts], True, (60, 50, 40), 2)

    # Interior passenger silhouettes
    cv2.circle(img, (car_x + int(car_w * 0.38), car_y + 60), 18, (40, 40, 40), -1)
    cv2.circle(img, (car_x + int(car_w * 0.62), car_y + 60), 18, (40, 40, 40), -1)

    # 5. Front Headlights
    hl_w = int(car_w * 0.18)
    hl_h = int(car_h * 0.14)
    hl_y = car_y + int(car_h * 0.48)
    # Left headlight
    cv2.rectangle(img, (car_x + 20, hl_y), (car_x + 20 + hl_w, hl_y + hl_h), (210, 240, 255), -1)
    cv2.rectangle(img, (car_x + 20, hl_y), (car_x + 20 + hl_w, hl_y + hl_h), (80, 80, 80), 2)
    # Right headlight
    cv2.rectangle(img, (car_x + car_w - 20 - hl_w, hl_y), (car_x + car_w - 20, hl_y + hl_h), (210, 240, 255), -1)
    cv2.rectangle(img, (car_x + car_w - 20 - hl_w, hl_y), (car_x + car_w - 20, hl_y + hl_h), (80, 80, 80), 2)

    # 6. Front Grille
    grille_x1 = car_x + int(car_w * 0.26)
    grille_x2 = car_x + int(car_w * 0.74)
    grille_y1 = car_y + int(car_h * 0.50)
    grille_y2 = car_y + int(car_h * 0.68)
    cv2.rectangle(img, (grille_x1, grille_y1), (grille_x2, grille_y2), (25, 25, 25), -1)
    cv2.rectangle(img, (grille_x1, grille_y1), (grille_x2, grille_y2), (90, 90, 90), 2)
    # Grille slats
    for gy in range(grille_y1 + 8, grille_y2, 10):
        cv2.line(img, (grille_x1 + 6, gy), (grille_x2 - 6, gy), (70, 70, 70), 2)

    # 7. Front Bumper
    bumper_y = car_y + int(car_h * 0.70)
    bumper_h = int(car_h * 0.22)
    cv2.rectangle(img, (car_x + 15, bumper_y), (car_x + car_w - 15, bumper_y + bumper_h), (110, 35, 20), -1)
    cv2.rectangle(img, (car_x + 15, bumper_y), (car_x + car_w - 15, bumper_y + bumper_h), (50, 20, 15), 2)

    # 8. High-Resolution Indian License Plate
    # Dimensions typical of standard Indian registration plate: 4.0 aspect ratio
    plate_w = int(car_w * 0.44)
    plate_h = int(plate_w * 0.25)  # 4.0 aspect ratio
    plate_x = car_x + (car_w - plate_w) // 2
    plate_y = car_y + int(car_h * 0.74)

    # Black mounting bracket
    cv2.rectangle(img, (plate_x - 4, plate_y - 4), (plate_x + plate_w + 4, plate_y + plate_h + 4), (10, 10, 10), -1)
    # White reflective plate surface
    cv2.rectangle(img, (plate_x, plate_y), (plate_x + plate_w, plate_y + plate_h), (255, 255, 255), -1)
    # Blue IND strip on the left (HSRP style)
    ind_w = int(plate_w * 0.08)
    cv2.rectangle(img, (plate_x, plate_y), (plate_x + ind_w, plate_y + plate_h), (180, 70, 20), -1)

    # Indian Registration Plate Characters: GJ01AB1234
    # Drawn with crisp black lettering
    plate_text = "GJ01AB1234"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = plate_h * 0.026
    thickness = max(2, int(plate_h * 0.07))
    text_size, _ = cv2.getTextSize(plate_text, font, font_scale, thickness)
    text_x = plate_x + ind_w + int((plate_w - ind_w - text_size[0]) / 2)
    text_y = plate_y + int((plate_h + text_size[1]) / 2)

    cv2.putText(
        img,
        plate_text,
        (text_x, text_y),
        font,
        font_scale,
        (0, 0, 0),
        thickness,
        cv2.LINE_AA,
    )


def generate_video():
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(OUTPUT_PATH, fourcc, FPS, (WIDTH, HEIGHT))

    print(f"Generating dedicated ANPR test video: {OUTPUT_PATH}...")

    # Vehicle motion: starts from left (x=100) moves to center (x=460) and slows down
    start_x = 120
    end_x = 480

    for i in range(NUM_FRAMES):
        frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
        draw_road(frame)

        # Smooth vehicle position
        alpha = min(1.0, i / 70.0)
        car_x = int(start_x + (end_x - start_x) * alpha)
        car_y = 360
        car_w = 460
        car_h = 280

        draw_realistic_car(frame, car_x, car_y, car_w, car_h)
        out.write(frame)

    out.release()
    print(f"Successfully generated {NUM_FRAMES} frames ({NUM_FRAMES / FPS:.1f}s) at {OUTPUT_PATH}")


if __name__ == "__main__":
    generate_video()
