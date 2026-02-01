-- Add visa_type column to profiles table for Australia visa-based tax calculation
-- Values: 'domestic', 'working_holiday', 'student_visa'

-- Add new visa_type column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS visa_type TEXT DEFAULT 'domestic';

-- Add constraint for valid values
ALTER TABLE profiles
ADD CONSTRAINT valid_visa_type
CHECK (visa_type IN ('domestic', 'working_holiday', 'student_visa'));

-- Migrate existing data: convert is_student_visa_holder boolean to visa_type
UPDATE profiles
SET visa_type = CASE
  WHEN is_student_visa_holder = true THEN 'student_visa'
  ELSE 'domestic'
END
WHERE visa_type IS NULL OR visa_type = 'domestic';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_visa_type ON profiles(visa_type);

-- Note: Keep is_student_visa_holder column for backward compatibility
-- Can be removed in a future migration after all clients are updated
