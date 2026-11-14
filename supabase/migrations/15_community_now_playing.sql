-- Migration: 15_community_now_playing.sql
-- Enables live song listening status and community profile customization

ALTER TABLE public.community_profiles 
  ADD COLUMN IF NOT EXISTS current_song_title TEXT,
  ADD COLUMN IF NOT EXISTS current_song_id INTEGER,
  ADD COLUMN IF NOT EXISTS is_playing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_now_playing BOOLEAN NOT NULL DEFAULT true;

-- Index for quickly looking up active listeners
CREATE INDEX IF NOT EXISTS idx_community_profiles_listening 
  ON public.community_profiles(is_playing) 
  WHERE is_playing = true;
