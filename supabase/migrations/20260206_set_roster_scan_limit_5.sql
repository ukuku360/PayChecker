-- Enforce monthly roster scan limit of 5 for all users.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS roster_scans_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS roster_scan_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS roster_scan_reset_month TEXT;

ALTER TABLE profiles
ALTER COLUMN roster_scan_limit SET DEFAULT 5;

UPDATE profiles
SET roster_scan_limit = 5
WHERE roster_scan_limit IS DISTINCT FROM 5;
