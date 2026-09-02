-- ============================================================
-- MIGRATION: 005_ai_events
-- Description: Creates event_types and events tables for tracking AI video analytics
--              detections (Person and Vehicle), bounding boxes, confidence,
--              and snapshot paths.
-- Phase: 7 — AI Video Analytics (Person & Vehicle Detection)
-- ============================================================

-- 1. Create event_types lookup table
CREATE TABLE IF NOT EXISTS event_types (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE event_types IS 'Normalized event type taxonomy for AI analytics and alert engine';
COMMENT ON COLUMN event_types.code IS 'Unique event code, e.g. PERSON_DETECTED, VEHICLE_DETECTED';

-- Seed initial Phase 7 event types
INSERT INTO event_types (code, name, description)
VALUES 
    ('PERSON_DETECTED', 'Person Detected', 'AI detected a human pedestrian in camera video feed'),
    ('VEHICLE_DETECTED', 'Vehicle Detected', 'AI detected a vehicle (car, motorcycle, bus, truck, bicycle) in camera video feed')
ON CONFLICT (code) DO NOTHING;

-- 2. Create events persistence table
CREATE TABLE IF NOT EXISTS events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id           UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    event_type_id       UUID NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
    detected_category   VARCHAR(30) NOT NULL,                  -- 'PERSON', 'VEHICLE'
    detected_class      VARCHAR(50) NOT NULL,                  -- 'person', 'car', 'bus', 'truck', 'motorcycle', 'bicycle'
    confidence          NUMERIC(5, 4) NOT NULL,                -- Detection confidence (0.0000 - 1.0000)
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),    -- Exact detection timestamp
    frame_width         INTEGER NOT NULL DEFAULT 640,
    frame_height        INTEGER NOT NULL DEFAULT 360,
    bbox_x              NUMERIC(8, 2) NOT NULL,                -- Normalized or pixel bounding box X
    bbox_y              NUMERIC(8, 2) NOT NULL,                -- Normalized or pixel bounding box Y
    bbox_width          NUMERIC(8, 2) NOT NULL,                -- Normalized or pixel bounding box Width
    bbox_height         NUMERIC(8, 2) NOT NULL,                -- Normalized or pixel bounding box Height
    snapshot_path       TEXT,                                  -- Relative safe path on D: drive under runtime/snapshots
    source              VARCHAR(50) NOT NULL DEFAULT 'YOLOv8n',-- Detection engine/model identifier
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,    -- Inference timing, sensor tags, extra metadata
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE events IS 'AI-generated video analytics events for surveillance, audits, and alerts';
COMMENT ON COLUMN events.detected_category IS 'Normalized application category: PERSON or VEHICLE';
COMMENT ON COLUMN events.detected_class IS 'Original YOLO COCO class: person, car, bus, truck, motorcycle, bicycle';
COMMENT ON COLUMN events.snapshot_path IS 'Safe relative path to snapshot image file on disk (NULL if capture unavailable)';

-- 3. Create high-performance query indexes
CREATE INDEX IF NOT EXISTS idx_events_camera_id ON events (camera_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (detected_category);
CREATE INDEX IF NOT EXISTS idx_events_camera_occurred ON events (camera_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_id ON events (event_type_id);
