-- Migration: 07_app_notifications.sql
-- Creates a table for admin to send push notifications to users

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to notifications"
  ON app_notifications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Anyone can read notifications
CREATE POLICY "Anyone can read notifications"
  ON app_notifications FOR SELECT
  USING (true);

-- Enable realtime so the app updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications;
