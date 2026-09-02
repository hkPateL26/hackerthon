"""
Tests for the AI Engine health endpoints.
Phase 1 — Foundation testing only.
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


class TestHealthEndpoints:
    """Tests for /health and /health/live endpoints."""

    def test_health_check_returns_200(self):
        """GET /health should return HTTP 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_check_status_ok(self):
        """GET /health should return status='ok'."""
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "ok"

    def test_health_check_has_required_fields(self):
        """GET /health should return all required fields."""
        response = client.get("/health")
        data = response.json()
        required_fields = [
            "status", "timestamp", "service", "version",
            "uptime", "environment", "python_version", "platform", "phase"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_health_check_service_name(self):
        """GET /health should return correct service name."""
        response = client.get("/health")
        data = response.json()
        assert data["service"] == "gujarat-police-cctv-ai-engine"

    def test_health_check_version(self):
        """GET /health should return version 1.0.0."""
        response = client.get("/health")
        data = response.json()
        assert data["version"] == "1.0.0"

    def test_health_check_uptime_is_positive(self):
        """GET /health uptime should be a positive number."""
        response = client.get("/health")
        data = response.json()
        assert isinstance(data["uptime"], (int, float))
        assert data["uptime"] >= 0

    def test_liveness_probe_returns_200(self):
        """GET /health/live should return HTTP 200."""
        response = client.get("/health/live")
        assert response.status_code == 200

    def test_liveness_probe_status_alive(self):
        """GET /health/live should return status='alive'."""
        response = client.get("/health/live")
        data = response.json()
        assert data["status"] == "alive"

    def test_root_endpoint_returns_200(self):
        """GET / should return HTTP 200."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_endpoint_has_docs_link(self):
        """GET / should include docs link."""
        response = client.get("/")
        data = response.json()
        assert "docs" in data


class TestApplicationSetup:
    """Tests verifying the application is configured correctly."""

    def test_app_has_correct_title(self):
        """FastAPI app should have correct title."""
        assert "Gujarat Police" in app.title

    def test_app_has_docs(self):
        """Swagger docs endpoint should be available."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_schema_available(self):
        """OpenAPI schema should be available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert "/health" in schema["paths"]
