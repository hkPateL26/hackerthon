"""
Configuration settings for Gujarat Police CCTV AI Engine (Phase 7).
Strict D: drive rules and configurable CPU inference thresholds.
"""

import os
from pathlib import Path

# Base project directory on D: drive
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent


class Settings:
    # Model configuration
    AI_MODEL_PATH: str = os.getenv(
        "AI_MODEL_PATH",
        str(BASE_DIR / "models" / "yolov8n.pt"),
    )
    AI_DEVICE: str = os.getenv("AI_DEVICE", "cpu")
    AI_CONFIDENCE_THRESHOLD: float = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.35"))
    AI_FRAME_SAMPLE_FPS: float = float(os.getenv("AI_FRAME_SAMPLE_FPS", "1.5"))
    AI_MAX_CONCURRENT_STREAMS: int = int(os.getenv("AI_MAX_CONCURRENT_STREAMS", "1"))

    # Security & Services
    AI_SERVICE_KEY: str = os.getenv(
        "AI_SERVICE_KEY",
        "gujarat_police_internal_ai_key_2026",
    )
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:3000")

    # Storage paths on D: drive
    SNAPSHOT_DIR: str = os.getenv(
        "SNAPSHOT_DIR",
        str(PROJECT_ROOT / "runtime" / "snapshots"),
    )
    YOLO_CONFIG_DIR: str = os.getenv(
        "YOLO_CONFIG_DIR",
        str(BASE_DIR / ".ultralytics"),
    )

    # Server settings
    AI_ENGINE_PORT: int = int(os.getenv("AI_ENGINE_PORT", "8000"))
    AI_ENGINE_HOST: str = os.getenv("AI_ENGINE_HOST", "0.0.0.0")


settings = Settings()

# Ensure D: drive Ultralytics cache directory is set in environment
os.environ["YOLO_CONFIG_DIR"] = settings.YOLO_CONFIG_DIR

# Ensure runtime directories exist on D: drive
Path(settings.SNAPSHOT_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.YOLO_CONFIG_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.AI_MODEL_PATH).parent.mkdir(parents=True, exist_ok=True)
