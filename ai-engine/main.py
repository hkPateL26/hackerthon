"""
Gujarat Police CCTV Integration & AI Video Analytics
AI Engine — FastAPI Application Entry Point (Phase 7).
YOLOv8n Person and Vehicle Detection on CPU.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import time

from src.config import settings
from src.routes.health import router as health_router
from src.routes.sessions import router as sessions_router, session_manager

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print("\n[INFO] Gujarat Police CCTV AI Engine starting...")
    print(f"       Phase 7: AI Video Analytics (YOLOv8n CPU Inference)")
    print(f"       Model path: {settings.AI_MODEL_PATH}")
    print(f"       Device: {settings.AI_DEVICE}, Sample FPS: {settings.AI_FRAME_SAMPLE_FPS}")
    print(f"       Max AI Concurrency: {settings.AI_MAX_CONCURRENT_STREAMS}")

    yield

    print("[INFO] AI Engine shutting down — stopping all active inference workers...")
    await session_manager.stop_all()
    print("[INFO] All AI workers stopped cleanly.")


app = FastAPI(
    title="Gujarat Police CCTV AI Engine",
    description=(
        "AI Video Analytics Engine for CCTV Integration Platform. "
        "Provides YOLOv8n-based person and vehicle detection, "
        "frame sampling, and event ingestion."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("BACKEND_URL", "http://localhost:3000"),
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(sessions_router)


@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint — status info."""
    return {
        "service": "gujarat-police-cctv-ai-engine",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "status": "Phase 7 — AI Video Analytics Active (Person & Vehicle Detection)",
        "device": settings.AI_DEVICE,
        "max_concurrent_streams": settings.AI_MAX_CONCURRENT_STREAMS,
    }


if __name__ == "__main__":
    import uvicorn

    port = settings.AI_ENGINE_PORT
    host = settings.AI_ENGINE_HOST
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("NODE_ENV", "development") == "development",
        log_level="info",
    )
