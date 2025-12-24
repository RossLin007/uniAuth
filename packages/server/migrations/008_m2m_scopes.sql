-- Enable UUID extension if not already enabled (should be, but good practice)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Scopes Table
-- Defines available permissions in the system
CREATE TABLE IF NOT EXISTS scopes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'openid', 'profile', 'read:users'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. App Scopes Table
-- Defines which scopes an application is allowed to request
CREATE TABLE IF NOT EXISTS app_scopes (
    app_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    scope_id UUID REFERENCES scopes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (app_id, scope_id)
);

-- 3. Pre-seed common scopes
INSERT INTO scopes (name, description) VALUES
('openid', 'OpenID Connect authentication'),
('profile', 'Access to user''s basic profile information'),
('email', 'Access to user''s email address'),
('phone', 'Access to user''s phone number'),
('offline_access', 'Access to Refresh Token')
ON CONFLICT (name) DO NOTHING;

-- 4. Audit Log for Scopes (Optional but recommended)
-- We can reuse the existing audit_logs table, just noting here that 'scope_created', 'scope_deleted' events should be logged via app logic.

-- 5. Update applications to include M2M specific fields if needed
-- (Not needed for now as we added allowed_grants in 007)
