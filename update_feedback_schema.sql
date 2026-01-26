-- Add reply columns if they don't exist
alter table feedback 
add column if not exists admin_reply text,
add column if not exists reply_created_at timestamptz;

-- Refresh Policies
drop policy if exists "Users can view own feedback" on feedback;
drop policy if exists "Users can select own feedback" on feedback; 
drop policy if exists "Admins can view all feedback" on feedback;
drop policy if exists "Admins can update feedback status" on feedback;
drop policy if exists "Admins can update feedback" on feedback;

-- Policy: Authenticated users can view their own feedback
create policy "Users can view own feedback"
on feedback for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Admin can view ALL feedback
-- Replace 'nayoonho2001@gmail.com' with your actual admin email if different
create policy "Admins can view all feedback"
on feedback for select
to authenticated
using (auth.jwt() ->> 'email' = 'nayoonho2001@gmail.com');

-- Policy: Admin can update feedback (reply, status change)
create policy "Admins can update feedback"
on feedback for update
to authenticated
using (auth.jwt() ->> 'email' = 'nayoonho2001@gmail.com')
with check (auth.jwt() ->> 'email' = 'nayoonho2001@gmail.com');
