-- Create Feedback Table
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  message text not null,
  type text not null check (type in ('feedback', 'feature_request', 'bug')),
  created_at timestamptz default now(),
  status text not null default 'new' check (status in ('new', 'read', 'completed')),
  user_email text -- Optional: store email for easier contact
);

-- Enable RLS
alter table feedback enable row level security;

-- Policy: Authenticated users can insert their own feedback
create policy "Users can insert their own feedback"
on feedback for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Admin can select/view all feedback (role-based)
create policy "Admins can view all feedback"
on feedback for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

-- Policy: Admin can update feedback (e.g. status)
create policy "Admins can update feedback status"
on feedback for update
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);
