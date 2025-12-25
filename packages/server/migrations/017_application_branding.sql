-- Migration: Application Branding (White-Label)
-- Allows customizing the appearance of the login page for each application

CREATE TABLE IF NOT EXISTS application_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    
    -- Logo and images
    logo_url TEXT,           -- Main logo displayed on login page
    favicon_url TEXT,        -- Browser favicon
    background_image_url TEXT, -- Optional background image
    
    -- Color scheme
    primary_color VARCHAR(7) DEFAULT '#3b82f6',      -- Primary button/link color (Hex)
    secondary_color VARCHAR(7) DEFAULT '#8b5cf6',    -- Secondary/accent color
    background_color VARCHAR(7) DEFAULT '#0f172a',   -- Page background color
    text_color VARCHAR(7) DEFAULT '#f8fafc',         -- Main text color
    card_color VARCHAR(7) DEFAULT '#1e293b',         -- Card/container background
    error_color VARCHAR(7) DEFAULT '#ef4444',        -- Error message color
    
    -- Typography
    font_family VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
    
    -- Custom CSS (advanced)
    custom_css TEXT,
    
    -- Text content
    login_title TEXT,                   -- Custom login page title
    login_subtitle TEXT,                -- Custom subtitle/welcome message
    footer_text TEXT,                   -- Footer copyright/text
    
    -- Feature toggles
    show_social_login BOOLEAN DEFAULT true,
    show_powered_by BOOLEAN DEFAULT true,    -- Show "Powered by UniAuth"
    
    -- Localization
    default_locale VARCHAR(10) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branding_timestamp
    BEFORE UPDATE ON application_branding
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

-- Index for fast lookup by application_id
CREATE INDEX IF NOT EXISTS idx_branding_application ON application_branding(application_id);

-- Comments
COMMENT ON TABLE application_branding IS 'White-label branding configuration for each application';
COMMENT ON COLUMN application_branding.primary_color IS 'Primary theme color in hex format (e.g., #3b82f6)';
COMMENT ON COLUMN application_branding.custom_css IS 'Custom CSS injected into the login page';
