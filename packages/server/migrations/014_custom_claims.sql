-- Migration: Add custom claims support
-- Purpose: Allow applications to define custom claims for ID tokens

-- Custom claims configuration table
CREATE TABLE IF NOT EXISTS custom_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    
    -- Claim configuration
    claim_name VARCHAR(255) NOT NULL,
    claim_source VARCHAR(50) NOT NULL CHECK (claim_source IN ('user_attribute', 'static', 'computed')),
    
    -- Source configuration (depends on claim_source type)
    source_field VARCHAR(255), -- For 'user_attribute': field from users table (e.g., 'email', 'phone', 'nickname')
    static_value TEXT, -- For 'static': fixed value
    computed_expression TEXT, -- For 'computed': expression to evaluate (future use)
    
    -- Transform function (optional)
    transform_function VARCHAR(50) CHECK (transform_function IN (
        'none',
        'uppercase',
        'lowercase',
        'hash_sha256',
        'base64_encode',
        'json_stringify'
    )) DEFAULT 'none',
    
    -- Scope requirement (claim only included if this scope is requested)
    required_scope VARCHAR(255),
    
    -- Metadata
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique claim names per application
    UNIQUE(application_id, claim_name)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_custom_claims_app_id ON custom_claims(application_id);
CREATE INDEX IF NOT EXISTS idx_custom_claims_enabled ON custom_claims(enabled) WHERE enabled = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_claims_updated_at
    BEFORE UPDATE ON custom_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_claims_updated_at();

-- Comments
COMMENT ON TABLE custom_claims IS 'Custom claims configuration for OIDC ID tokens per application';
COMMENT ON COLUMN custom_claims.claim_source IS 'Source type: user_attribute (from user profile), static (fixed value), computed (expression)';
COMMENT ON COLUMN custom_claims.required_scope IS 'If set, claim is only included when this scope is requested';
