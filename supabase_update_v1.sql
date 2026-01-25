-- Migration to add Rate History and Shift Notes support

-- Add rate_history column to job_configs table
ALTER TABLE public.job_configs 
ADD COLUMN IF NOT EXISTS rate_history jsonb default '[]'::jsonb;

-- Add note column to shifts table
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS note text;
