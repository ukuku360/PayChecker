-- Create a table for Job Configurations
create table public.job_configs (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  config_id text not null, -- The string ID used in the app (e.g., 'RA', 'STF')
  name text not null,
  color text not null,
  default_hours_weekday numeric not null,
  default_hours_weekend numeric not null,
  hourly_rate_weekday numeric not null,
  hourly_rate_saturday numeric not null,
  hourly_rate_sunday numeric not null,
  hourly_rate_holiday numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id),
  unique(user_id, config_id)
);

-- Create a table for Shifts
create table public.shifts (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date text not null, -- Storing as 'YYYY-MM-DD' text to match app logic
  type text not null, -- Corresponds to job_configs.config_id
  hours numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id),
  unique(user_id, date, type) -- Prevent duplicate shifts for same job on same day
);

-- Enable Row Level Security (RLS)
alter table public.job_configs enable row level security;
alter table public.shifts enable row level security;

-- Create policies for Job Configs
create policy "Users can view their own job configs"
  on public.job_configs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own job configs"
  on public.job_configs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own job configs"
  on public.job_configs for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own job configs"
  on public.job_configs for delete
  using ( auth.uid() = user_id );

-- Create policies for Shifts
create policy "Users can view their own shifts"
  on public.shifts for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own shifts"
  on public.shifts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own shifts"
  on public.shifts for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own shifts"
  on public.shifts for delete
  using ( auth.uid() = user_id );

-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  is_student_visa_holder boolean default false,
  vacation_periods jsonb default '[]'::jsonb,
  savings_goal numeric default 0,
  holidays jsonb default '[]'::jsonb,
  expenses jsonb default '[]'::jsonb,
  is_admin boolean default false,
  
  primary key (id)
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );


-- =============================================
-- MIGRATION: Add new columns to existing tables
-- Run this if you already have the tables created
-- =============================================

-- Add rate_history column to job_configs
ALTER TABLE public.job_configs 
ADD COLUMN IF NOT EXISTS rate_history jsonb DEFAULT '[]'::jsonb;

-- Add note column to shifts
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS note text;

-- Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS savings_goal numeric DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS holidays jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expenses jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
