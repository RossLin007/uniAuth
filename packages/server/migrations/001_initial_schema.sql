-- UniAuth Database Schema
-- 统一认证平台数据库架构
-- 
-- Run this migration on your Supabase project to set up the required tables.
-- 在 Supabase 项目上运行此迁移以设置所需的表。

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table (用户表)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    nickname VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- Verification Codes Table (验证码表)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20),
    email VARCHAR(255),
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('login', 'register', 'reset', 'email_verify')),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for verification_codes table
CREATE INDEX IF NOT EXISTS idx_vc_phone_type ON verification_codes(phone, type);
CREATE INDEX IF NOT EXISTS idx_vc_email_type ON verification_codes(email, type);
CREATE INDEX IF NOT EXISTS idx_vc_expires ON verification_codes(expires_at);

-- ============================================
-- Refresh Tokens Table (刷新令牌表)
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    device_info JSONB,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refresh_tokens table
CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at);

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

-- ============================================
-- Applications Table (应用表)
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    app_key VARCHAR(64) UNIQUE NOT NULL,
    app_secret VARCHAR(128) NOT NULL,
    redirect_uris TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for applications table
CREATE INDEX IF NOT EXISTS idx_apps_app_key ON applications(app_key);

-- ============================================
-- Audit Logs Table (审计日志表)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_al_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_al_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_created_at ON audit_logs(created_at);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Functions for automatic timestamp updates
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for applications table
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for oauth_accounts table
DROP TRIGGER IF EXISTS update_oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER update_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Cleanup functions for expired data
-- ============================================

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM verification_codes
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() - INTERVAL '1 day'
    OR revoked = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Completed successfully! / 迁移完成！
-- ============================================
