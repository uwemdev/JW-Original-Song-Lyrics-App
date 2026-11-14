-- Migration: 12_curation_and_announcements.sql
-- Supports:
-- 1. Home Screen Curation (Song of the Day overrides and schedule)
-- 2. Home Screen Spotlight / Featured Songs Carousel
-- 3. In-App Announcements and Notice Banners

-- ── 1. Song of the Day Curation Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_daily_songs (
  date DATE PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_daily_songs_song_id ON public.app_daily_songs(song_id);

ALTER TABLE public.app_daily_songs ENABLE ROW LEVEL SECURITY;

-- Anonymous users can read daily songs
CREATE POLICY "Anyone can view daily songs"
  ON public.app_daily_songs FOR SELECT
  USING (true);

-- Authenticated admins can manage daily songs
CREATE POLICY "Admins can manage daily songs"
  ON public.app_daily_songs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 2. Featured / Spotlight Songs Table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.app_featured_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  badge_text TEXT DEFAULT 'Featured',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_featured_songs_song_id ON public.app_featured_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_app_featured_songs_active_sort ON public.app_featured_songs(is_active, sort_order);

ALTER TABLE public.app_featured_songs ENABLE ROW LEVEL SECURITY;

-- Anonymous users can view active featured songs
CREATE POLICY "Anyone can view active featured songs"
  ON public.app_featured_songs FOR SELECT
  USING (true);

-- Authenticated admins can manage featured songs
CREATE POLICY "Admins can manage featured songs"
  ON public.app_featured_songs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 3. In-App Announcements Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  banner_type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'alert'
  action_type TEXT NOT NULL DEFAULT 'none', -- 'none', 'song', 'category', 'url'
  action_id TEXT,                          -- song UUID, category ID, or external web link
  action_label TEXT,                       -- button text e.g. 'Listen Now'
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_announcements_active ON public.app_announcements(is_active, starts_at, expires_at);

ALTER TABLE public.app_announcements ENABLE ROW LEVEL SECURITY;

-- Anonymous users can view active announcements
CREATE POLICY "Anyone can view active announcements"
  ON public.app_announcements FOR SELECT
  USING (true);

-- Authenticated admins can manage announcements
CREATE POLICY "Admins can manage announcements"
  ON public.app_announcements FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
