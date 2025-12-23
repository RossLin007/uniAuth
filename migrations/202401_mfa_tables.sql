-- MFA Tables Migration for UniAuth
-- MFA 数据表迁移

-- Create mfa_secrets table for storing TOTP secrets
CREATE TABLE IF NOT EXISTS mfa_secrets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_mfa UNIQUE (user_id)
);

-- Create mfa_recovery_codes table for storing backup codes
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user_id ON mfa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_code_hash ON mfa_recovery_codes(code_hash);

-- Add RLS policies for mfa_secrets
ALTER TABLE mfa_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA secrets" ON mfa_secrets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA secrets" ON mfa_secrets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA secrets" ON mfa_secrets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own MFA secrets" ON mfa_secrets
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for mfa_recovery_codes
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery codes" ON mfa_recovery_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery codes" ON mfa_recovery_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery codes" ON mfa_recovery_codes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery codes" ON mfa_recovery_codes
    FOR DELETE USING (auth.uid() = user_id);

-- Grant service role full access
GRANT ALL ON mfa_secrets TO service_role;
GRANT ALL ON mfa_recovery_codes TO service_role;
