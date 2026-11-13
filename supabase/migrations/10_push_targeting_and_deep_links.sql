-- Migration: 10_push_targeting_and_deep_links.sql
-- Adds versioning, last active timestamp, audience targeting, and song deep-linking

-- 1. Enhance device_push_tokens with app version and activity tracking
ALTER TABLE public.device_push_tokens 
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_last_active 
  ON public.device_push_tokens(last_active_at);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_app_version 
  ON public.device_push_tokens(app_version);

-- 2. Enhance app_notifications with audience targeting and song deep-link reference
ALTER TABLE public.app_notifications 
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_app_notifications_song_id 
  ON public.app_notifications(song_id);
