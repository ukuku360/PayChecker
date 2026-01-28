-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  is_student_visa_holder boolean default false,
  vacation_periods jsonb default '[]'::jsonb,
  savings_goal numeric default 0,
  holidays jsonb default '[]'::jsonb,
  expenses jsonb default '[]'::jsonb,
  country varchar(2) default null, -- 'AU' (Australia) or 'KR' (Korea), null means not selected
  updated_at timestamptz default now()
);

-- Migration for existing tables (run if table already exists)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT NULL;

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  to authenticated
  with check (auth.uid() = id);

-- 2. JOB CONFIGS TABLE
create table if not exists job_configs (
  config_id text not null, -- Using text as ID from client UUID generation
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text not null,
  default_hours_weekday numeric default 0,
  default_hours_weekend numeric default 0,
  hourly_rate_weekday numeric default 0,
  hourly_rate_saturday numeric default 0,
  hourly_rate_sunday numeric default 0,
  hourly_rate_holiday numeric default 0,
  rate_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  primary key (config_id)
);

alter table job_configs enable row level security;

create policy "Users can view own job configs" on job_configs
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own job configs" on job_configs
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own job configs" on job_configs
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own job configs" on job_configs
  to authenticated
  using (auth.uid() = user_id);

-- 3. SHIFTS TABLE
create table if not exists shifts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  type text not null, -- References job_configs.config_id, but enforced softly to allow historical data if config deleted? Or just text.
  hours numeric default 0,
  note text,
  created_at timestamptz default now(),
  unique (user_id, date, type)
);

alter table shifts enable row level security;

create policy "Users can view own shifts" on shifts
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own shifts" on shifts
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own shifts" on shifts
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own shifts" on shifts
  to authenticated
  using (auth.uid() = user_id);

-- 4. FEEDBACK TABLE (Ensure it exists as per previous setup)
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  message text not null,
  type text not null check (type in ('feedback', 'feature_request', 'bug')),
  created_at timestamptz default now(),
  status text not null default 'new' check (status in ('new', 'read', 'completed')),
  user_email text
);

alter table feedback enable row level security;

-- Drop existing policies to avoid conflicts if re-running
drop policy if exists "Users can insert their own feedback" on feedback;
drop policy if exists "Admins can view all feedback" on feedback;
drop policy if exists "Admins can update feedback status" on feedback;

create policy "Users can insert their own feedback"
  on feedback for insert
  to authenticated
  with check (true);
