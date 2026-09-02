-- ============================================================
-- MIGRATION: 003_camera_registry
-- Description: Creates districts, police_stations, cameras (with PostGIS Point geometry & GIST index),
--              camera_groups, and camera_group_members.
-- Phase: 3 — Centralized CCTV Camera Registry
-- ============================================================

-- ============================================================
-- 1. DISTRICTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS districts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        VARCHAR(20) NOT NULL UNIQUE,
    state       VARCHAR(50) NOT NULL DEFAULT 'Gujarat',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE districts IS 'Administrative police districts / commissionerates in Gujarat';

CREATE INDEX IF NOT EXISTS idx_districts_name ON districts (name);
CREATE INDEX IF NOT EXISTS idx_districts_code ON districts (code);

CREATE TRIGGER set_districts_updated_at
    BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 2. POLICE STATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS police_stations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id     UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(30) NOT NULL UNIQUE,
    contact_number  VARCHAR(30),
    address         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_police_station_district_name UNIQUE (district_id, name)
);

COMMENT ON TABLE police_stations IS 'Police stations under specific district jurisdictions';

CREATE INDEX IF NOT EXISTS idx_police_stations_district ON police_stations (district_id);
CREATE INDEX IF NOT EXISTS idx_police_stations_code ON police_stations (code);

CREATE TRIGGER set_police_stations_updated_at
    BEFORE UPDATE ON police_stations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 3. CAMERAS TABLE (with PostGIS Point Geometry)
-- ============================================================
CREATE TABLE IF NOT EXISTS cameras (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_code         VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    camera_type         VARCHAR(30) NOT NULL DEFAULT 'FIXED', -- FIXED, PTZ, DOME, BULLET, BOX, OTHER
    vendor              VARCHAR(100),
    model               VARCHAR(100),
    serial_number       VARCHAR(100),
    ip_address          VARCHAR(45),
    port                INTEGER DEFAULT 554,
    rtsp_url            TEXT,                                 -- Sanitized in API responses
    location_name       VARCHAR(255),
    district_id         UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    police_station_id   UUID NOT NULL REFERENCES police_stations(id) ON DELETE RESTRICT,
    latitude            DOUBLE PRECISION NOT NULL,            -- WGS84 (-90 to 90)
    longitude           DOUBLE PRECISION NOT NULL,            -- WGS84 (-180 to 180)
    geom                GEOMETRY(Point, 4326),                -- PostGIS spatial point
    status              VARCHAR(30) NOT NULL DEFAULT 'ONLINE', -- ONLINE, OFFLINE, UNKNOWN, MAINTENANCE, DISABLED
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    installed_at        TIMESTAMPTZ,
    last_seen_at        TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}',
    deleted_at          TIMESTAMPTZ,                          -- Soft delete timestamp
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cameras IS 'Centralized CCTV Camera Registry with PostGIS spatial point geometry';
COMMENT ON COLUMN cameras.rtsp_url IS 'RTSP stream configuration. Credentials must NEVER be returned in API responses.';
COMMENT ON COLUMN cameras.geom IS 'PostGIS 2D Point (SRID 4326) automatically synchronized with latitude and longitude.';

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_cameras_code ON cameras (camera_code);
CREATE INDEX IF NOT EXISTS idx_cameras_district ON cameras (district_id);
CREATE INDEX IF NOT EXISTS idx_cameras_police_station ON cameras (police_station_id);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras (status);
CREATE INDEX IF NOT EXISTS idx_cameras_type ON cameras (camera_type);
CREATE INDEX IF NOT EXISTS idx_cameras_active ON cameras (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cameras_created_at ON cameras (created_at DESC);

-- PostGIS GIST Spatial Index
CREATE INDEX IF NOT EXISTS idx_cameras_geom ON cameras USING GIST (geom);

-- Triggers for auto-updating timestamps & geometry
CREATE TRIGGER set_cameras_updated_at
    BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE FUNCTION trigger_sync_camera_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_camera_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON cameras
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_camera_geom();

-- ============================================================
-- 4. CAMERA GROUPS & MEMBERSHIP
-- ============================================================
CREATE TABLE IF NOT EXISTS camera_groups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE camera_groups IS 'Logical camera groupings (e.g. VIP corridors, highway stretches, commercial hubs)';

CREATE TRIGGER set_camera_groups_updated_at
    BEFORE UPDATE ON camera_groups
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS camera_group_members (
    group_id    UUID NOT NULL REFERENCES camera_groups(id) ON DELETE CASCADE,
    camera_id   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, camera_id)
);

COMMENT ON TABLE camera_group_members IS 'Many-to-many junction between camera groups and cameras';

CREATE INDEX IF NOT EXISTS idx_camera_group_members_camera ON camera_group_members (camera_id);
