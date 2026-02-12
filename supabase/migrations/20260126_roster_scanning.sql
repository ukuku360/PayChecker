-- Roster Scanning Feature Migration
-- Run this in Supabase SQL Editor

-- 1. Roster Scans Table - Stores scan history
CREATE TABLE IF NOT EXISTS roster_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  parsed_result JSONB NOT NULL,
  shifts_created INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Job Aliases Table - Maps roster names to user's job configs
CREATE TABLE IF NOT EXISTS job_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  job_config_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, alias)
);

-- 3. Add roster scan tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS roster_scans_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS roster_scan_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS roster_scan_reset_month TEXT;

-- 4. RLS Policies for roster_scans
ALTER TABLE roster_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roster scans" ON roster_scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roster scans" ON roster_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roster scans" ON roster_scans
  FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS Policies for job_aliases
ALTER TABLE job_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job aliases" ON job_aliases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job aliases" ON job_aliases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job aliases" ON job_aliases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job aliases" ON job_aliases
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Index for faster alias lookups
CREATE INDEX IF NOT EXISTS idx_job_aliases_user_alias ON job_aliases(user_id, alias);
CREATE INDEX IF NOT EXISTS idx_roster_scans_user_created ON roster_scans(user_id, created_at DESC);

-- 7. Function to reset monthly scan count (optional, can be called by a cron job)
CREATE OR REPLACE FUNCTION reset_monthly_roster_scans()
RETURNS void AS $$
DECLARE
  current_month TEXT := to_char(now(), 'YYYY-MM');
BEGIN
  UPDATE profiles
  SET roster_scans_this_month = 0, roster_scan_reset_month = current_month
  WHERE roster_scan_reset_month IS DISTINCT FROM current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
