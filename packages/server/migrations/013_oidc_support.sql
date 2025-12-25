-- Migration: Add nonce field for OIDC support
-- Description: Adds nonce column to oauth_authorization_codes for OpenID Connect compliance
-- Date: 2025-12-24

-- Add nonce column for OIDC nonce parameter
-- Nonce is used to prevent replay attacks in OIDC flows
ALTER TABLE oauth_authorization_codes 
ADD COLUMN IF NOT EXISTS nonce TEXT;

-- Add comment for documentation
COMMENT ON COLUMN oauth_authorization_codes.nonce IS 'OIDC nonce parameter for replay attack prevention';
