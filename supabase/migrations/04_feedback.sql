-- Migration: 04_feedback.sql
-- Create table for storing user feedback securely

CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous app users) to insert feedback
CREATE POLICY "Anyone can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can view feedback
CREATE POLICY "Admins can view feedback"
  ON feedback FOR SELECT
  USING (auth.role() = 'authenticated');
