-- OAuth 2.0 Provider Support
-- OAuth 2.0 提供商支持

-- 1. Standardize Applications Table
-- 标准化应用表 (将 app_key/app_secret 重命名为标准的 client_id/client_secret)
ALTER TABLE applications RENAME COLUMN app_key TO client_id;
ALTER TABLE applications RENAME COLUMN app_secret TO client_secret;

-- Add description and logo
ALTER TABLE applications ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS homepage_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT FALSE;

-- 2. Create Authorization Codes Table
-- 创建授权码表
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    code VARCHAR(128) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL REFERENCES applications(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    scope TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for code lookup
CREATE INDEX IF NOT EXISTS idx_auth_codes_client ON oauth_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_user ON oauth_authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_expires ON oauth_authorization_codes(expires_at);

-- RLS
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
