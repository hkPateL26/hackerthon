"""
FastAPI routes for AI session lifecycle management.
Guarded by service-to-service X-AI-Service-Key.
"""

from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field

from src.config import settings
from src.pipeline.session_manager import SessionManager, SessionTelemetry

router = APIRouter(prefix="/api/ai/sessions", tags=["AI Sessions"])

# Global session manager instance
session_manager = SessionManager()


async def verify_service_key(
    x_ai_service_key: Optional[str] = Header(None, alias="x-ai-service-key"),
    authorization: Optional[str] = Header(None),
):
    """Verifies service-to-service authentication key."""
    provided_key = x_ai_service_key
    if not provided_key and authorization and authorization.startswith("Bearer "):
        provided_key = authorization.split(" ")[1]

    if not provided_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing service authentication key",
        )

    if provided_key != settings.AI_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service authentication key",
        )
    return True


class StartSessionRequest(BaseModel):
    cameraId: str
    cameraCode: str
    sourceUrl: str
    sampleFps: float = Field(default=1.5, ge=0.2, le=5.0)
    confidenceThreshold: float = Field(default=0.5, ge=0.1, le=1.0)


class SessionResponse(BaseModel):
    cameraId: str
    cameraCode: str
    status: str
    sampleFps: float
    confidenceThreshold: float
    processedFrames: int
    detectionsCount: int
    approxFps: float
    startedAt: Optional[str] = None
    lastProcessedAt: Optional[str] = None
    error: Optional[str] = None


@router.post("/start", response_model=SessionResponse, dependencies=[Depends(verify_service_key)])
async def start_session(req: StartSessionRequest):
    """Starts a new camera AI analytics inference session."""
    try:
        telemetry = await session_manager.start_session(
            camera_id=req.cameraId,
            camera_code=req.cameraCode,
            source_url=req.sourceUrl,
            sample_fps=req.sampleFps,
            confidence_threshold=req.confidenceThreshold,
        )
        return SessionResponse(
            cameraId=telemetry.camera_id,
            cameraCode=telemetry.camera_code,
            status=telemetry.status,
            sampleFps=telemetry.sample_fps,
            confidenceThreshold=telemetry.confidence_threshold,
            processedFrames=telemetry.processed_frames,
            detectionsCount=telemetry.detections_count,
            approxFps=telemetry.approx_fps,
            startedAt=telemetry.started_at,
            lastProcessedAt=telemetry.last_processed_at,
            error=telemetry.error,
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start AI session: {str(e)}",
        )


@router.post("/{cameraId}/stop", response_model=SessionResponse, dependencies=[Depends(verify_service_key)])
async def stop_session(cameraId: str):
    """Stops an active camera AI session."""
    telemetry = await session_manager.stop_session(cameraId)
    return SessionResponse(
        cameraId=telemetry.camera_id,
        cameraCode=telemetry.camera_code,
        status=telemetry.status,
        sampleFps=telemetry.sample_fps,
        confidenceThreshold=telemetry.confidence_threshold,
        processedFrames=telemetry.processed_frames,
        detectionsCount=telemetry.detections_count,
        approxFps=telemetry.approx_fps,
        startedAt=telemetry.started_at,
        lastProcessedAt=telemetry.last_processed_at,
        error=telemetry.error,
    )


@router.get("", response_model=List[SessionResponse], dependencies=[Depends(verify_service_key)])
async def list_sessions():
    """Lists all AI inference sessions."""
    sessions = session_manager.list_sessions()
    return [
        SessionResponse(
            cameraId=t.camera_id,
            cameraCode=t.camera_code,
            status=t.status,
            sampleFps=t.sample_fps,
            confidenceThreshold=t.confidence_threshold,
            processedFrames=t.processed_frames,
            detectionsCount=t.detections_count,
            approxFps=t.approx_fps,
            startedAt=t.started_at,
            lastProcessedAt=t.last_processed_at,
            error=t.error,
        )
        for t in sessions
    ]


@router.get("/{cameraId}", response_model=SessionResponse, dependencies=[Depends(verify_service_key)])
async def get_session(cameraId: str):
    """Gets single camera AI session telemetry."""
    telemetry = session_manager.get_session(cameraId)
    if not telemetry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No AI session found for camera {cameraId}",
        )
    return SessionResponse(
        cameraId=telemetry.camera_id,
        cameraCode=telemetry.camera_code,
        status=telemetry.status,
        sampleFps=telemetry.sample_fps,
        confidenceThreshold=telemetry.confidence_threshold,
        processedFrames=telemetry.processed_frames,
        detectionsCount=telemetry.detections_count,
        approxFps=telemetry.approx_fps,
        startedAt=telemetry.started_at,
        lastProcessedAt=telemetry.last_processed_at,
        error=telemetry.error,
    )


@router.get("/{cameraId}/tracks", dependencies=[Depends(verify_service_key)])
async def get_camera_active_tracks(cameraId: str):
    """Gets runtime active tracks for a camera."""
    tracks_info = session_manager.get_active_tracks(cameraId)
    if not tracks_info:
        return {
            "cameraId": cameraId,
            "sessionId": None,
            "activeTracks": [],
        }
    return tracks_info
