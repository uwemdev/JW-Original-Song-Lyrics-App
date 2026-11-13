-- Migration: 09_device_push_tokens.sql
-- Stores Expo Push Tokens / FCM tokens for remote push notifications

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  push_token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow devices to register and update their push token
CREATE POLICY "Anyone can upsert push tokens"
  ON public.device_push_tokens FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_device_id ON public.device_push_tokens(device_id);

