"""
Health check routes for the AI Engine.
"""

import time
import platform
import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Capture startup time
START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str
    version: str
    uptime: float
    environment: str
    python_version: str
    platform: str
    phase: str


class LivenessResponse(BaseModel):
    status: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Full health check for the AI Engine service.
    Returns service status, uptime, and environment information.
    No authentication required — used by Docker health checks and monitoring.
    """
    return HealthResponse(
        status="ok",
        timestamp=__import__("datetime").datetime.utcnow().isoformat() + "Z",
        service="gujarat-police-cctv-ai-engine",
        version="1.0.0",
        uptime=round(time.time() - START_TIME, 2),
        environment=os.getenv("NODE_ENV", "development"),
        python_version=platform.python_version(),
        platform=platform.system(),
        phase="Phase 1 — Foundation. Detection starts Phase 7.",
    )


@router.get("/health/live", response_model=LivenessResponse)
async def liveness() -> LivenessResponse:
    """Lightweight liveness probe for Kubernetes/Docker."""
    return LivenessResponse(status="alive")
