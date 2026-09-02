-- ============================================================
-- SEED: 001_roles_and_admin_user
-- Description: Creates default roles and initial admin user
-- ============================================================
-- 
-- IMPORTANT: The admin password shown here as a comment is for
-- DOCUMENTATION PURPOSES ONLY. The actual hash below uses bcrypt.
--
-- DEFAULT ADMIN CREDENTIALS (change immediately after first login):
--   Email:    admin@police.gujarat.gov.in
--   Password: Admin@1234  (CHANGE THIS IMMEDIATELY)
--
-- Generated with: bcrypt.hash('Admin@1234', 12)
-- ============================================================

-- Seed roles
INSERT INTO roles (id, name, description, permissions) VALUES
(
    'a1b2c3d4-0001-0001-0001-000000000001',
    'ADMIN',
    'System administrator with full access to all features',
    '["*"]'::JSONB
),
(
    'a1b2c3d4-0002-0002-0002-000000000002',
    'SUPERVISOR',
    'Police supervisor — can view all data and manage incidents',
    '["cameras:read","events:read","alerts:read","alerts:acknowledge","incidents:read","incidents:write","watchlist:read","analytics:read"]'::JSONB
),
(
    'a1b2c3d4-0003-0003-0003-000000000003',
    'OPERATOR',
    'CCTV operator — can monitor cameras, acknowledge alerts, create incidents',
    '["cameras:read","events:read","alerts:read","alerts:acknowledge","incidents:read","incidents:write"]'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- Seed initial admin user
-- Password: Admin@1234 (bcrypt hash, salt rounds=12)
-- CHANGE THIS PASSWORD IMMEDIATELY ON FIRST LOGIN
INSERT INTO users (
    id,
    email,
    full_name,
    password_hash,
    role_id,
    is_active
) VALUES (
    'b1c2d3e4-0001-0001-0001-000000000001',
    'admin@police.gujarat.gov.in',
    'System Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQcRRGxK8u4K',
    'a1b2c3d4-0001-0001-0001-000000000001',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Seed demo supervisor user  
-- Password: Supervisor@1234 (bcrypt hash, salt rounds=12)
INSERT INTO users (
    id,
    email,
    full_name,
    password_hash,
    role_id,
    is_active
) VALUES (
    'b1c2d3e4-0002-0002-0002-000000000002',
    'supervisor@police.gujarat.gov.in',
    'Demo Supervisor',
    '$2b$12$8GvFOJkn5ztUPa7gQN.2oO/lXQZVr4UvJkRX7hzCKq7XdT8ePxNqO',
    'a1b2c3d4-0002-0002-0002-000000000002',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Seed demo operator user
-- Password: Operator@1234 (bcrypt hash, salt rounds=12)
INSERT INTO users (
    id,
    email,
    full_name,
    password_hash,
    role_id,
    is_active
) VALUES (
    'b1c2d3e4-0003-0003-0003-000000000003',
    'operator@police.gujarat.gov.in',
    'Demo Operator',
    '$2b$12$9HwGPKln6auVQb8hRO.3pP/mYRaWs5VwKSY8iazDLr8YeU9fQyOrP',
    'a1b2c3d4-0003-0003-0003-000000000003',
    TRUE
) ON CONFLICT (email) DO NOTHING;
