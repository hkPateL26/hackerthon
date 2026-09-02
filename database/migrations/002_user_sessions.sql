-- ============================================================
-- MIGRATION: 002_user_sessions
-- Description: Creates user_sessions table for secure refresh token
--              rotation, session tracking, and instant revocation.
-- Phase: 2 — Authentication & RBAC
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL,   -- SHA-256 hex digest of refresh token
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_sessions IS 'User refresh token sessions with SHA-256 fingerprinting';
COMMENT ON COLUMN user_sessions.token_hash IS 'SHA-256 hex digest of refresh token string. NEVER store raw refresh tokens.';
COMMENT ON COLUMN user_sessions.is_revoked IS 'True if session has been invalidated upon logout or rotation';

-- Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions (user_id, is_revoked) WHERE is_revoked = FALSE;

-- Auto-update updated_at trigger
CREATE TRIGGER set_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
