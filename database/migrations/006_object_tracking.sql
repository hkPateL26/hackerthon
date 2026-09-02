-- ============================================================
-- MIGRATION: 006_object_tracking
-- Description: Creates tracks table for session-scoped Multi-Object Tracking (ByteTrack),
--              adds track_id to events table, and seeds track start event types.
-- Phase: 8 — Object Tracking / Multi-Object Tracking
-- ============================================================

-- 1. Seed initial Phase 8 event types
INSERT INTO event_types (code, name, description)
VALUES 
    ('PERSON_TRACK_STARTED', 'Person Track Started', 'AI initiated a new stable track for a person'),
    ('VEHICLE_TRACK_STARTED', 'Vehicle Track Started', 'AI initiated a new stable track for a vehicle')
ON CONFLICT (code) DO NOTHING;

-- 2. Add track_id column to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS track_id INTEGER NULL;
CREATE INDEX IF NOT EXISTS idx_events_camera_track_id ON events (camera_id, track_id);

-- 3. Create tracks persistence table
CREATE TABLE IF NOT EXISTS tracks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id           UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    session_id          UUID NOT NULL,                         -- AI Session UUID isolating track ID scope
    track_id            INTEGER NOT NULL,                      -- Numeric track ID allocated by ByteTrack (e.g. 1, 2, 17)
    category            VARCHAR(30) NOT NULL,                  -- 'PERSON', 'VEHICLE'
    detected_class      VARCHAR(50) NOT NULL,                  -- 'person', 'car', 'bus', 'truck', 'motorcycle', 'bicycle'
    status              VARCHAR(20) NOT NULL,                  -- 'NEW', 'ACTIVE', 'LOST', 'TERMINATED'
    first_seen_at       TIMESTAMPTZ NOT NULL,                  -- When track was first confirmed
    last_seen_at        TIMESTAMPTZ NOT NULL,                  -- Most recent detection timestamp
    detection_count     INTEGER NOT NULL DEFAULT 0,            -- Number of frames object was detected
    confidence          NUMERIC(5, 4),                         -- Most recent detection confidence
    bbox_x              NUMERIC(8, 2),                         -- Bounding box X
    bbox_y              NUMERIC(8, 2),                         -- Bounding box Y
    bbox_width          NUMERIC(8, 2),                         -- Bounding box Width
    bbox_height         NUMERIC(8, 2),                         -- Bounding box Height
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,    -- Recent center points / trajectory history / tags
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_camera_session_track UNIQUE (camera_id, session_id, track_id)
);

COMMENT ON TABLE tracks IS 'Session-scoped multi-object tracking identities and trajectories';
COMMENT ON COLUMN tracks.session_id IS 'AI Session UUID preventing track_id collision between sessions on same camera';
COMMENT ON COLUMN tracks.track_id IS 'Integer track ID unique within the active AI session on this camera';
COMMENT ON COLUMN tracks.status IS 'Track lifecycle status: NEW, ACTIVE, LOST, TERMINATED';

-- 4. Create high-performance query indexes
CREATE INDEX IF NOT EXISTS idx_tracks_camera_session_track ON tracks (camera_id, session_id, track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_camera_status ON tracks (camera_id, status);
CREATE INDEX IF NOT EXISTS idx_tracks_camera_last_seen ON tracks (camera_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks (status);
