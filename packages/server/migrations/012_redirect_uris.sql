-- Migration: Add redirect_uris to applications table
-- This allows applications to specify allowed OAuth redirect URLs

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS redirect_uris TEXT[] DEFAULT '{}';

-- Add homepage_url and privacy_policy_url for OAuth consent
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS homepage_url TEXT,
ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT,
ADD COLUMN IF NOT EXISTS terms_of_service_url TEXT;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_applications_redirect_uris ON applications USING GIN(redirect_uris);

COMMENT ON COLUMN applications.redirect_uris IS 'Array of allowed OAuth redirect URIs';
COMMENT ON COLUMN applications.homepage_url IS 'Application homepage URL';
COMMENT ON COLUMN applications.privacy_policy_url IS 'Privacy policy URL';
COMMENT ON COLUMN applications.terms_of_service_url IS 'Terms of service URL';
