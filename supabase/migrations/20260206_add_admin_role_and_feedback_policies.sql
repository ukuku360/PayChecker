-- Add role-based admin flag and migrate feedback/reply policies away from email checks.

-- 1) Admin flag on profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE profiles
SET is_admin = false
WHERE is_admin IS NULL;

-- 2) Feedback policy refresh
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can select own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can update feedback status" ON feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;

CREATE POLICY "Users can insert their own feedback"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
);

CREATE POLICY "Admins can update feedback"
ON feedback FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
);

-- 3) Feedback replies policy refresh
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view replies to own feedback" ON feedback_replies;
DROP POLICY IF EXISTS "Admins can view all replies" ON feedback_replies;
DROP POLICY IF EXISTS "Users can reply to own feedback" ON feedback_replies;
DROP POLICY IF EXISTS "Admins can reply to any feedback" ON feedback_replies;

CREATE POLICY "Users can view replies to own feedback"
ON feedback_replies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM feedback f
    WHERE f.id = feedback_replies.feedback_id
      AND f.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all replies"
ON feedback_replies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
);

CREATE POLICY "Users can reply to own feedback"
ON feedback_replies FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM feedback f
    WHERE f.id = feedback_replies.feedback_id
      AND f.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
  AND COALESCE(is_admin_reply, false) = false
);

CREATE POLICY "Admins can reply to any feedback"
ON feedback_replies FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_admin_reply = true
  AND EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
);
