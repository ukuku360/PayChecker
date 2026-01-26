-- Add has_seen_help column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_seen_help boolean DEFAULT false;
