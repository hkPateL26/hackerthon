-- Migration 007: Automatic Number Plate Recognition (ANPR) Schema
-- Phase: 9 — ANPR / License Plate Recognition

-- 1. Create ANPR results table
CREATE TABLE IF NOT EXISTS anpr_results (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id                   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    session_id                  UUID NULL,                             -- Session UUID (mandatory if track_id is set)
    track_id                    INTEGER NULL,                          -- Associated vehicle Track ID
    vehicle_class               VARCHAR(50) NULL,                      -- 'car', 'bus', 'truck', 'motorcycle'
    plate_text_raw              VARCHAR(32) NOT NULL,                  -- Raw unprocessed OCR text
    plate_text_normalized       VARCHAR(32) NULL,                      -- Uppercase alphanumeric normalized
    validation_status           VARCHAR(30) NOT NULL DEFAULT 'VALID',  -- 'VALID', 'LOW_CONFIDENCE', 'INVALID_FORMAT'
    plate_detection_confidence  NUMERIC(5, 4) NULL,                    -- Plate localization confidence (0.0 - 1.0)
    ocr_confidence              NUMERIC(5, 4) NULL,                    -- Text OCR recognition confidence (0.0 - 1.0)
    final_confidence            NUMERIC(5, 4) NULL,                    -- Blended confidence score (0.0 - 1.0)
    plate_bbox_x                NUMERIC(8, 2) NULL,                    -- Plate bounding box X (frame coordinates)
    plate_bbox_y                NUMERIC(8, 2) NULL,                    -- Plate bounding box Y (frame coordinates)
    plate_bbox_width            NUMERIC(8, 2) NULL,                    -- Plate bounding box Width
    plate_bbox_height           NUMERIC(8, 2) NULL,                    -- Plate bounding box Height
    plate_snapshot_path         TEXT NULL,                             -- Relative path on D: (e.g. runtime/anpr/plates/...)
    vehicle_snapshot_path       TEXT NULL,                             -- Relative path on D: (e.g. runtime/anpr/vehicles/...)
    occurred_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),    -- Observation timestamp
    metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,    -- Extra attributes (OCR details, vehicle bbox)
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Consistency rule: If track_id is set, session_id MUST NOT be null
    CONSTRAINT chk_anpr_track_session CHECK (track_id IS NULL OR session_id IS NOT NULL),
    -- Validation status check
    CONSTRAINT chk_anpr_validation_status CHECK (validation_status IN ('VALID', 'LOW_CONFIDENCE', 'INVALID_FORMAT'))
);

COMMENT ON TABLE anpr_results IS 'Automatic Number Plate Recognition (ANPR) observation records';
COMMENT ON COLUMN anpr_results.plate_text_raw IS 'Exact raw OCR output prior to normalization';
COMMENT ON COLUMN anpr_results.plate_text_normalized IS 'Cleaned uppercase alphanumeric string';
COMMENT ON COLUMN anpr_results.validation_status IS 'Indian registration syntax validation status';

-- 2. Performance and Query Indexes
CREATE INDEX IF NOT EXISTS idx_anpr_camera_occurred ON anpr_results (camera_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_anpr_camera_track ON anpr_results (camera_id, track_id);
CREATE INDEX IF NOT EXISTS idx_anpr_camera_session_track ON anpr_results (camera_id, session_id, track_id);
CREATE INDEX IF NOT EXISTS idx_anpr_plate_normalized ON anpr_results (plate_text_normalized);
CREATE INDEX IF NOT EXISTS idx_anpr_validation_status ON anpr_results (validation_status);
CREATE INDEX IF NOT EXISTS idx_anpr_occurred_at ON anpr_results (occurred_at DESC);

-- 3. Seed canonical ANPR event type
INSERT INTO event_types (code, name, description)
VALUES (
    'ANPR_DETECTED',
    'Automatic Number Plate Recognized',
    'Vehicle license plate detected and recognized via OCR'
)
ON CONFLICT (code) DO NOTHING;
