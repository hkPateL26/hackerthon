# 🛡️ Gujarat Police CCTV Integration & AI Video Analytics Platform

[![Node.js](https://img.shields.io/badge/Node.js-v24.15-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-12.0-red.svg)](https://nestjs.com/)
[![Python](https://img.shields.io/badge/Python-3.11.15-yellow.svg)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.4-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial%20Ready-green.svg)](https://postgis.net/)

> **State-wide Intelligent CCTV Video Management & Real-time AI Analytics System**  
> Developed for the Gujarat Police Hackathon Challenge.

---

## 📌 1. Project Overview & Hackathon Purpose

This platform is a unified, production-scalable solution for integrating heterogeneous CCTV networks across police stations, districts, and command centers in Gujarat. It bridges multi-vendor VMS architectures with high-throughput AI video intelligence, providing:

- **Centralized CCTV Registry & GIS Mapping:** Unified tracking of thousands of camera nodes with precise geospatial coordinates.
- **Edge/Central AI Video Analytics:** Real-time person/vehicle detection, object tracking, and Automatic Number Plate Recognition (ANPR).
- **Automated Incident & Alert Engine:** Instant priority alert dispatching via WebSockets when watchlist targets or anomalies are spotted.
- **Cross-Camera Intelligence Workspace:** Visual tracking of suspects and vehicles across multiple camera streams along chronological paths.

---

## 🏗️ 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      POLICE COMMAND & CONTROL UI                        │
│             React 19 + TypeScript + Vite + Zustand + CSS Modules        │
│          GIS Maps │ Live Feeds │ Alert Panel │ Investigation Workspace  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST / WebSocket (Socket.IO)
┌────────────────────────────────────▼────────────────────────────────────┐
│                         API GATEWAY & BACKEND                           │
│                 NestJS 12 + TypeORM + PostgreSQL Driver                 │
│      Auth/RBAC │ Camera Registry │ Events Engine │ Incident Workflow    │
└──────────────────┬──────────────────────────────────┬───────────────────┘
                   │ SQL                              │ HTTP Event Ingestion
┌──────────────────▼──────────────────┐   ┌───────────▼───────────────────┐
│        POSTGRESQL DATABASE          │   │        AI ANALYTICS ENGINE    │
│  PostgreSQL 18 + PostGIS Extensions │   │       FastAPI + Python 3.11   │
│  • Roles, Users, Audits (Phase 1)   │   │  • Video Ingestion Pipeline   │
│  • Cameras, Streams (Phase 3-5)     │   │  • YOLOv8 Detection (Phase 7) │
│  • Events, Alerts (Phase 12)        │   │  • ByteTrack Tracking (Ph 8)  │
│  • Incidents, Evidence (Phase 13)   │   │  • ANPR OCR Engine (Phase 9)  │
└─────────────────────────────────────┘   └───────────────────────────────┘
```

---

## 📂 3. Repository Structure

```
D:\Movies and Web se\hackerthon\
├── .github/
│   └── workflows/              # CI/CD Workflows
├── frontend/                   # React 19 + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── components/layout/  # Navigation, Header, Layout Shell
│   │   ├── pages/              # Dashboard, Cameras, Alerts, Incidents, Login
│   │   ├── test/               # Vitest + React Testing Library suites
│   │   ├── App.tsx             # Route Configuration
│   │   └── main.tsx            # App Entry Point
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # NestJS 12 Enterprise Backend
│   ├── src/
│   │   ├── config/             # Environment & Database Configuration
│   │   ├── modules/health/     # Health check & Liveness probe module
│   │   ├── app.module.ts       # Root Module
│   │   └── main.ts             # Application Bootstrap & Swagger Setup
│   ├── test/
│   ├── package.json
│   └── vitest.config.ts
├── ai-engine/                  # Python 3.11 + FastAPI Analytics Service
│   ├── src/
│   │   ├── detectors/          # YOLO Detection Stubs (Phase 7)
│   │   ├── pipeline/           # Video Ingestion Stubs (Phase 5)
│   │   └── routes/             # Health & Liveness Endpoints
│   ├── tests/                  # Pytest test suite
│   ├── .venv/                  # Virtual Environment (strictly on D:)
│   ├── requirements.txt
│   └── main.py
├── database/                   # Database Schemas & Migrations
│   ├── migrations/             # SQL Migrations (001_initial_foundation.sql)
│   └── seeds/                  # Initial Seeds (Roles & Admin User)
├── docker/                     # Dockerfiles & Deployment Configs
├── sample-data/                # Video and camera sample datasets
├── scripts/                    # PowerShell management scripts
│   ├── seed.ps1                # Database migration and seed runner
│   └── dev-start.ps1           # Multi-service launcher
├── .env.example                # Root environment template
├── .gitignore
├── docker-compose.yml          # Production-like multi-container compose
├── docker-compose.dev.yml      # Local dev database compose
└── README.md
```

---

## 💾 4. Absolute D: Drive Compliance

To comply with storage and partition guidelines, all project assets and environments reside on drive `D:`:
- **Project Root:** `D:\Movies and Web se\hackerthon`
- **Node Dependencies:** `D:\Movies and Web se\hackerthon\backend\node_modules` & `frontend\node_modules`
- **Python Virtual Environment:** `D:\Movies and Web se\hackerthon\ai-engine\.venv`
- **Docker Mounts:** Bind-mounted directly to `D:\Movies and Web se\hackerthon\docker-data`

---

## ⚙️ 5. Prerequisites & Environment Setup

### Required Tools
- **Node.js:** v24.15.0+ (`node --version`)
- **npm:** v11.12.1+ (`npm --version`)
- **Git:** v2.53.0+ (`git --version`)
- **Python:** 3.11.15 (`ai-engine\.venv\Scripts\python.exe`)
- **PostgreSQL:** 16+ or 18.4 (`psql --version`)
- **pgAdmin 4:** Installed at `D:\pgAdmin 4` for GUI administration

---

## 🚀 6. Quick Start Guide

### Step 1: Database Setup & Seed
Run the automated migration and seed script using PowerShell:
```powershell
.\scripts\seed.ps1
```
This initializes the `cctv_hackathon` database, applies migrations for `roles`, `users`, and `audit_logs`, and seeds the default roles (`ADMIN`, `SUPERVISOR`, `OPERATOR`) and initial admin user.

### Step 2: Running Backend (NestJS)
```powershell
cd backend
npm run start:dev
```
- API Base URL: `http://localhost:3000/api`
- Swagger Documentation: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/health`

### Step 3: Running Frontend (React)
```powershell
cd frontend
npm run dev
```
- Application Dashboard: `http://localhost:5173`

### Step 4: Running AI Engine (FastAPI)
```powershell
cd ai-engine
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Or Launch All Services Together:
```powershell
.\scripts\dev-start.ps1
```

---

## 🧪 7. Automated Testing & Verification

### Backend Tests
```powershell
cd backend
npm test
```
*Executes Vitest suite with SWC compilation for controller and health modules.*

### Frontend Tests
```powershell
cd frontend
npm test
```
*Executes React Testing Library + Vitest tests for layout and stub pages.*

### AI Engine Tests
```powershell
cd ai-engine
.\.venv\Scripts\pytest tests
```
*Validates FastAPI endpoints and uptime monitors.*

---

## 🔒 8. Security & Initial Credentials

| Role | Default Email | Password |
|------|---------------|----------|
| **Administrator** | `admin@police.gujarat.gov.in` | `Admin@1234` |
| **Supervisor** | `supervisor@police.gujarat.gov.in` | `Supervisor@1234` |
| **Operator** | `operator@police.gujarat.gov.in` | `Operator@1234` |

> ⚠️ **IMPORTANT:** Passwords in the database are stored as salted bcrypt hashes (12 rounds). Change default passwords immediately upon production deployment.

---

## 🗺️ 9. Project Roadmap & Current Phase

### ✅ Completed Phases:
- **Phase 1:** Foundation, PostgreSQL 18, PostGIS, FFmpeg, NestJS, React, FastAPI scaffold.
- **Phase 2:** Authentication & RBAC (JWT, HttpOnly refresh cookies, SHA-256 tokens, rate limiting).
- **Phase 3:** Centralized CCTV Camera Registry (CRUD, GeoJSON, pagination, soft-delete, district/station).
- **Phase 4:** GIS Camera Mapping (Leaflet interactive map, clustering, bounding box spatial filtering).
- **Phase 5:** Video Ingestion & HLS Stream Management (FFmpeg pipeline, HLS delivery, VideoPlayer).
- **Phase 6:** Unified Camera Monitoring Dashboard (Multi-camera grid 1x1/2x2/2x3/3x3, 4-stream live playback, concurrency cap enforcement, camera picker, duplicate prevention, quick details, unmount cleanup).

### ⏳ Intentionally Deferred to Later Phases:
- **Phase 7:** AI Person & Vehicle Detection (YOLOv8)
- **Phase 8:** Multi-Object Tracking (ByteTrack)
- **Phase 9:** Automatic Number Plate Recognition (ANPR)
- **Phase 10:** Watchlist Matching & Alerts
- **Phase 11:** Cross-Camera Search & Vehicle Journey
- **Phase 12:** Event Engine & Real-time Alerting (WebSocket)
- **Phase 13:** Incident Management Workflow
- **Phase 14:** Investigation & Evidence Management
- **Phase 15:** Dashboard Analytics & Heatmaps
- **Phase 16:** Camera Health Monitoring
- **Phase 17:** Security Hardening & Complete Audit Trail
