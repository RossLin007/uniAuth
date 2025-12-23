-- Fix Users Table Constraints
-- 修复用户表约束
-- 
-- Run this in Supabase SQL Editor
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 1. Make phone nullable (allow email-only users)
-- 允许手机号为空（支持仅邮箱注册的用户）
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- 2. Make sure email is nullable (allow phone-only users)
-- 确保邮箱可为空（支持仅手机号注册的用户）
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- 3. Add constraint to ensure at least one contact method exists
-- 添加约束，确保至少存在一种联系方式（手机号或邮箱）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_or_email_check;
ALTER TABLE users ADD CONSTRAINT users_phone_or_email_check 
    CHECK (phone IS NOT NULL OR email IS NOT NULL);

-- 4. Verify indexes exist
-- 验证索引是否存在
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
