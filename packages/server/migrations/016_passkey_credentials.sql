-- Migration: Passkey/WebAuthn Credentials
-- This table stores WebAuthn credentials for passwordless authentication

CREATE TABLE IF NOT EXISTS passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- WebAuthn credential data
    credential_id TEXT UNIQUE NOT NULL,  -- Base64URL encoded credential ID
    public_key TEXT NOT NULL,             -- Base64URL encoded public key
    counter INTEGER DEFAULT 0,            -- Signature counter for replay protection
    
    -- Device information
    device_type VARCHAR(20) DEFAULT 'platform',  -- 'platform' or 'cross-platform'
    device_name TEXT,                     -- User-friendly device name
    transports TEXT[],                    -- ['usb', 'ble', 'nfc', 'internal', 'hybrid']
    
    -- Attestation info
    aaguid TEXT,                          -- Authenticator AAGUID
    attestation_type VARCHAR(50),         -- 'none', 'indirect', 'direct', 'enterprise'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
    CONSTRAINT valid_device_type CHECK (device_type IN ('platform', 'cross-platform'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passkey_user_id ON passkey_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credential_id ON passkey_credentials(credential_id);

-- Comments
COMMENT ON TABLE passkey_credentials IS 'WebAuthn/Passkey credentials for passwordless authentication';
COMMENT ON COLUMN passkey_credentials.credential_id IS 'Base64URL encoded credential ID from authenticator';
COMMENT ON COLUMN passkey_credentials.public_key IS 'COSE public key in Base64URL format';
COMMENT ON COLUMN passkey_credentials.counter IS 'Signature counter to prevent replay attacks';
COMMENT ON COLUMN passkey_credentials.device_type IS 'platform = built-in (Face ID, fingerprint), cross-platform = security key';
