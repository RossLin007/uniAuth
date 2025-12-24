-- Add owner_id to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster lookups by owner
CREATE INDEX IF NOT EXISTS idx_apps_owner_id ON applications(owner_id);

-- Start comment: owner_id allows linking an app to a specific developer user account.
-- Existing apps will have NULL owner_id (system owned or unassigned).
