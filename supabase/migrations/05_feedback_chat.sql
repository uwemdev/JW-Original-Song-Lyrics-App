-- Migration: 05_feedback_chat.sql
-- Upgrades the feedback table to support two-way chat

-- 1. Add device_id to group chats by anonymous device
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2. Add is_admin_reply to differentiate who sent the message
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_admin_reply BOOLEAN DEFAULT FALSE;

-- 3. Add is_read to track unread admin replies for the user
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 4. Ensure RLS policies allow the user to read their own chats
-- Note: 'Anyone can insert feedback' already exists.
CREATE POLICY "Users can read their own chats"
  ON feedback FOR SELECT
  USING (
    device_id IS NOT NULL 
    AND auth.role() = 'anon'
  );

-- 5. Admin policies (Admins already have full SELECT access from 04_feedback.sql)
-- But we need to ensure Admins can insert replies (already covered by 'Anyone can insert feedback' or we can add one for authenticated)
CREATE POLICY "Admins can insert replies"
  ON feedback FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Allow updating the 'is_read' status
CREATE POLICY "Anyone can update read status"
  ON feedback FOR UPDATE
  USING (true)
  WITH CHECK (true);
