-- UniAuth Database Schema v2
-- 添加邮箱登录和 OAuth 支持
-- 
-- 如果您已经运行了 001_initial_schema.sql，请运行此迁移来添加新功能
-- If you have already run 001_initial_schema.sql, run this migration to add new features

-- ============================================
-- Update Users Table - Add email field
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index for email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- Update Verification Codes Table - Add email field
-- ============================================
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_type_check;
ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_type_check 
    CHECK (type IN ('login', 'register', 'reset', 'email_verify'));

-- Create index for email in verification_codes
CREATE INDEX IF NOT EXISTS idx_vc_email_type ON verification_codes(email, type);

-- ============================================
-- OAuth Accounts Table (OAuth 账户表)
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Indexes for oauth_accounts table
CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id);

-- Enable RLS on oauth_accounts
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;

-- Trigger for oauth_accounts table
DROP TRIGGER IF EXISTS update_oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER update_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
