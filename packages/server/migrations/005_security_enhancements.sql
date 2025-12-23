-- Phase 1 Security Enhancements
-- 第一阶段安全增强
--
-- This migration adds:
-- 1. PKCE support for OAuth2 authorization codes
-- 2. Client secret hashing preparation
-- 3. Verification attempt tracking improvements

-- ============================================
-- 1. Add PKCE Support to Authorization Codes
-- 为授权码添加 PKCE 支持
-- ============================================

-- Add code_challenge fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'oauth_authorization_codes' 
        AND column_name = 'code_challenge'
    ) THEN
        ALTER TABLE oauth_authorization_codes 
            ADD COLUMN code_challenge VARCHAR(128),
            ADD COLUMN code_challenge_method VARCHAR(10);
    END IF;
END $$;

-- ============================================
-- 2. Add Client Secret Hash Column
-- 添加客户端密钥哈希列
-- ============================================

-- Add hash column for secure secret storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'client_secret_hash'
    ) THEN
        ALTER TABLE applications 
            ADD COLUMN client_secret_hash VARCHAR(255);
        
        -- Add comment explaining the migration process
        COMMENT ON COLUMN applications.client_secret_hash IS 
            'Bcrypt hash of client_secret. During migration, both columns exist. After full migration, client_secret will be removed.';
    END IF;
END $$;

-- ============================================
-- 3. Add Public Client Flag
-- 添加公共客户端标识
-- ============================================

-- Public clients (mobile/SPA) don't have secrets and must use PKCE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE applications 
            ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN applications.is_public IS 
            'Public clients (mobile apps, SPAs) do not have client_secret and must use PKCE';
    END IF;
END $$;

-- ============================================
-- 4. Add Token Scopes Support
-- 添加令牌权限范围支持
-- ============================================

-- Create scopes table for fine-grained permissions
CREATE TABLE IF NOT EXISTS oauth_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scopes
INSERT INTO oauth_scopes (name, description, is_default) VALUES
    ('profile', 'Read user profile information (name, avatar)', TRUE),
    ('email', 'Read user email address', FALSE),
    ('phone', 'Read user phone number', FALSE),
    ('offline_access', 'Request refresh tokens for long-lived access', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. Add IP Blacklist Table
-- 添加 IP 黑名单表
-- ============================================

CREATE TABLE IF NOT EXISTS ip_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    reason VARCHAR(255),
    blocked_until TIMESTAMPTZ,
    is_permanent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip_address)
);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_blocked_until ON ip_blacklist(blocked_until);

-- ============================================
-- 6. Add Request Rate Tracking (for fallback without Redis)
-- 添加请求速率追踪（无 Redis 时的备选方案）
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key ON rate_limit_entries(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON rate_limit_entries(expires_at);

-- Cleanup function for expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_entries WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Enhance Audit Logs for Security Events
-- 增强审计日志以记录安全事件
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'event_category'
    ) THEN
        ALTER TABLE audit_logs 
            ADD COLUMN event_category VARCHAR(50),
            ADD COLUMN risk_level VARCHAR(20);
        
        -- Update existing entries
        UPDATE audit_logs SET 
            event_category = 'authentication',
            risk_level = 'low'
        WHERE event_category IS NULL;
    END IF;
END $$;

-- Index for security event queries
CREATE INDEX IF NOT EXISTS idx_al_event_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_al_risk_level ON audit_logs(risk_level);

-- ============================================
-- Completed successfully!
-- 迁移完成！
-- ============================================
