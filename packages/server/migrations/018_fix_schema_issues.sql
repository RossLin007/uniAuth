-- Migration: Fix Schema Issues and Ensure SSO Portal App
-- Description: Adds missing client_id to refresh_tokens and creates sso-portal app
-- Date: 2025-12-31

-- 1. Add client_id to refresh_tokens if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'client_id') THEN 
        ALTER TABLE refresh_tokens ADD COLUMN client_id VARCHAR(64);
        CREATE INDEX idx_rt_client_id ON refresh_tokens(client_id);
    END IF;
END $$;

-- 2. Ensure SSO Portal application exists
INSERT INTO applications (name, client_id, app_key, app_secret, redirect_uris, status, app_type, is_trusted, is_public, description)
VALUES (
    'SSO Portal', 
    'sso-portal', 
    'sso-portal', -- app_key same as client_id usually
    'sso-portal-secret', -- Should be a real secret in prod, but fine for internal app
    ARRAY['http://localhost:5173', 'https://sso.55387.xyz'], 
    'active', 
    'spa', 
    true,
    true,
    'UniAuth SSO Portal'
)
ON CONFLICT (app_key) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    is_trusted = true,
    is_public = true;

-- 3. Ensure Developer Console is trusted and public
UPDATE applications 
SET is_trusted = true, is_public = true 
WHERE client_id = 'developer_console';
