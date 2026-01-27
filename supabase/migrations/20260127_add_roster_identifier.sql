-- Add roster_identifier column to profiles table
-- This stores the user's preferred identifier for filtering roster scans
-- Structure: { name?: string, color?: string, position?: string, customNote?: string }

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS roster_identifier JSONB DEFAULT NULL;

-- Add comment explaining the column structure
COMMENT ON COLUMN profiles.roster_identifier IS 'User identifier for filtering roster scans: { name?: string, color?: string, position?: string, customNote?: string }';
