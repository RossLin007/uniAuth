-- Migration: Add SSO session support
-- Purpose: Enable Single Sign-On with central session management

-- SSO sessions table
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session token (stored in cookie)
    session_token VARCHAR(128) UNIQUE NOT NULL,
    
    -- Applications sharing this session
    apps UUID[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Session options
    remember_me BOOLEAN DEFAULT false,
    
    -- Context
    ip_address INET,
    user_agent TEXT
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_token ON sso_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires ON sso_sessions(expires_at);

-- Trigger for cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM sso_sessions WHERE expires_at < NOW() - INTERVAL '1 day';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup occasionally on insert (simple approach)
CREATE TRIGGER trigger_cleanup_sso_sessions
    AFTER INSERT ON sso_sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_sso_sessions();

-- Comments
COMMENT ON TABLE sso_sessions IS 'SSO sessions for Single Sign-On across applications';
COMMENT ON COLUMN sso_sessions.apps IS 'Array of application UUIDs that share this session';
COMMENT ON COLUMN sso_sessions.remember_me IS 'If true, session lasts 30 days; otherwise 24 hours';
