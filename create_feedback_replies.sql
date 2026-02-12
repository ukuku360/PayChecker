-- Create Feedback Replies Table
create table if not exists feedback_replies (
  id uuid default gen_random_uuid() primary key,
  feedback_id uuid references feedback(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now(),
  is_admin_reply boolean default false
);

-- Enable RLS
alter table feedback_replies enable row level security;

-- Policy: Users can view replies for their own feedback
-- We join with the parent feedback table to check ownership
create policy "Users can view replies to own feedback"
on feedback_replies for select
to authenticated
using (
  exists (
    select 1 from feedback
    where feedback.id = feedback_replies.feedback_id
    and feedback.user_id = auth.uid()
  )
);

-- Policy: Admin can view ALL replies
create policy "Admins can view all replies"
on feedback_replies for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

-- Policy: Users can insert replies to their own feedback
create policy "Users can reply to own feedback"
on feedback_replies for insert
to authenticated
with check (
  exists (
    select 1 from feedback
    where feedback.id = feedback_replies.feedback_id
    and feedback.user_id = auth.uid()
  )
  and sender_id = auth.uid()
  and coalesce(is_admin_reply, false) = false
);

-- Policy: Admin can insert replies to any feedback
create policy "Admins can reply to any feedback"
on feedback_replies for insert
to authenticated
with check (
  sender_id = auth.uid()
  and is_admin_reply = true
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);
