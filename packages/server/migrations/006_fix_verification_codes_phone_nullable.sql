-- Fix verification_codes table to allow phone to be NULL for email verification
-- 修复 verification_codes 表，允许 phone 为空以支持邮箱验证
-- 
-- This migration fixes an issue where email verification codes could not be stored
-- because the phone column had a NOT NULL constraint.
-- 此迁移修复了因 phone 列有 NOT NULL 约束而无法存储邮箱验证码的问题。

-- Allow phone to be NULL
ALTER TABLE verification_codes ALTER COLUMN phone DROP NOT NULL;

-- Add a check constraint to ensure either phone or email is provided
-- 添加检查约束确保 phone 或 email 至少有一个值
ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS vc_phone_or_email_required;
ALTER TABLE verification_codes ADD CONSTRAINT vc_phone_or_email_required 
    CHECK (phone IS NOT NULL OR email IS NOT NULL);
