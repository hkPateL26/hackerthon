-- ============================================================
-- MIGRATION: 004_stream_sessions
-- Description: Creates the streams table for tracking video ingestion,
--              FFmpeg process lifecycle, HLS outputs, and stream status.
-- Phase: 5 — Video Ingestion & Stream Integration
-- ============================================================

CREATE TABLE IF NOT EXISTS streams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id       UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    source_type     VARCHAR(30) NOT NULL DEFAULT 'FILE',   -- 'FILE', 'RTSP'
    source_url      TEXT NOT NULL,                         -- Sanitized path or URL reference
    output_type     VARCHAR(30) NOT NULL DEFAULT 'HLS',    -- 'HLS'
    status          VARCHAR(30) NOT NULL DEFAULT 'STOPPED', -- 'STOPPED', 'STARTING', 'RUNNING', 'STOPPING', 'ERROR'
    process_id      INTEGER,                               -- FFmpeg process PID
    hls_path        TEXT,                                  -- Safe local relative directory
    playback_url    VARCHAR(255),                          -- Safe browser-accessible URL
    started_at      TIMESTAMPTZ,
    stopped_at      TIMESTAMPTZ,
    last_error      TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_streams_camera UNIQUE (camera_id)
);

COMMENT ON TABLE streams IS 'Live video stream ingestion sessions and HLS transcoding metadata';
COMMENT ON COLUMN streams.source_type IS 'Type of video source: FILE (sample prototype) or RTSP (production IP camera)';
COMMENT ON COLUMN streams.status IS 'Runtime status: STOPPED, STARTING, RUNNING, STOPPING, ERROR';
COMMENT ON COLUMN streams.playback_url IS 'Browser playback endpoint, e.g., /api/streams/hls/:cameraId/index.m3u8';

CREATE INDEX IF NOT EXISTS idx_streams_camera_id ON streams (camera_id);
CREATE INDEX IF NOT EXISTS idx_streams_status ON streams (status);

CREATE TRIGGER set_streams_updated_at
    BEFORE UPDATE ON streams
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
