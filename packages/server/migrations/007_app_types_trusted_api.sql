-- Phase 1: Trusted Client API Support / 嵌入式登录 API 支持
-- Migration: 007_app_types_trusted_api.sql
-- Date: 2025-12-23

-- 1. Add application type field
-- 添加应用类型字段
ALTER TABLE applications ADD COLUMN IF NOT EXISTS 
    app_type VARCHAR(20) DEFAULT 'web' 
    CHECK (app_type IN ('web', 'spa', 'native', 'm2m'));

COMMENT ON COLUMN applications.app_type IS 
    '应用类型: web(服务端), spa(单页应用), native(原生应用), m2m(机器对机器)';

-- 2. Add allowed grants field
-- 添加允许的授权模式字段
ALTER TABLE applications ADD COLUMN IF NOT EXISTS 
    allowed_grants TEXT[] DEFAULT ARRAY['authorization_code'];

COMMENT ON COLUMN applications.allowed_grants IS 
    '允许的授权模式: authorization_code, trusted_client, client_credentials, refresh_token';

-- 3. Update existing applications to include trusted_client grant
-- 更新现有应用以支持 trusted_client 授权模式
UPDATE applications 
SET allowed_grants = ARRAY['authorization_code', 'trusted_client', 'refresh_token']
WHERE allowed_grants IS NULL OR allowed_grants = ARRAY['authorization_code'];

-- 4. Create index for app_type lookups
-- 为应用类型创建索引
CREATE INDEX IF NOT EXISTS idx_applications_app_type ON applications(app_type);

-- 5. Add client_secret_hash column if not exists (for secure secret storage)
-- 添加密钥哈希字段（安全存储密钥）
ALTER TABLE applications ADD COLUMN IF NOT EXISTS client_secret_hash TEXT;

COMMENT ON COLUMN applications.client_secret_hash IS 
    'bcrypt 哈希后的 client_secret，用于安全验证';
 