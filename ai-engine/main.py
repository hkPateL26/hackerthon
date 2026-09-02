"""
Gujarat Police CCTV Integration & AI Video Analytics
AI Engine — FastAPI Application Entry Point

Phase 1: Foundation only — health endpoint
Phase 7+: YOLO detection will be added here
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import time

from src.routes.health import router as health_router

# Application start time for uptime tracking
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print("\n[INFO] Gujarat Police CCTV AI Engine starting...")
    print("       Phase 1: Foundation mode -- detection not yet active")
    # Phase 7+: Initialize YOLO model here
    yield
    print("[INFO] AI Engine shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Gujarat Police CCTV AI Engine",
    description=(
        "AI Video Analytics Engine for CCTV Integration Platform. "
        "Provides YOLO-based person/vehicle detection, object tracking, "
        "and ANPR plate recognition capabilities."
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


@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint — redirect info."""
    return {
        "service": "gujarat-police-cctv-ai-engine",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "status": "Phase 1 — Foundation only. Detection active from Phase 7.",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_ENGINE_PORT", "8000"))
    host = os.getenv("AI_ENGINE_HOST", "0.0.0.0")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("NODE_ENV", "development") == "development",
        log_level="info",
    )
