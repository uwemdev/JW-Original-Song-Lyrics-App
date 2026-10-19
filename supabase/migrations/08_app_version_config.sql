-- Migration: 08_app_version_config.sql
-- Table to manage remote app versioning, forced updates, and release announcements

CREATE TABLE IF NOT EXISTS public.app_version_config (
  id INT PRIMARY KEY DEFAULT 1,
  platform TEXT NOT NULL DEFAULT 'android',
  latest_version TEXT NOT NULL DEFAULT '1.0.2',
  min_required_version TEXT NOT NULL DEFAULT '1.0.0',
  force_update BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL DEFAULT 'Update Available 🎉',
  message TEXT NOT NULL DEFAULT 'A new version of JW Original Song Lyrics is available on Google Play. Update now for the latest features and improvements.',
  release_notes TEXT DEFAULT '• Improved audio player performance\n• Bug fixes and stability enhancements',
  store_url TEXT NOT NULL DEFAULT 'market://details?id=com.jworiginalsongslyrics.app',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_version_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for mobile and web clients to check versions)
DROP POLICY IF EXISTS "Allow public read access on app_version_config" ON public.app_version_config;
CREATE POLICY "Allow public read access on app_version_config"
  ON public.app_version_config FOR SELECT
  USING (true);

-- Allow authenticated admins full access to update configs
DROP POLICY IF EXISTS "Allow admin full access on app_version_config" ON public.app_version_config;
CREATE POLICY "Allow admin full access on app_version_config"
  ON public.app_version_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed initial row for Android
INSERT INTO public.app_version_config (
  id,
  platform,
  latest_version,
  min_required_version,
  force_update,
  title,
  message,
  release_notes,
  store_url
) VALUES (
  1,
  'android',
  '1.0.2',
  '1.0.0',
  false,
  'New Update Available 🎉',
  'A new version of JW Original Song Lyrics is available on Google Play. Update now for the latest features and improvements.',
  '• Improved audio player performance\n• Skip 10s forward/backward controls\n• Bug fixes and stability enhancements',
  'market://details?id=com.jworiginalsongslyrics.app'
) ON CONFLICT (id) DO UPDATE SET
  platform = EXCLUDED.platform,
  store_url = EXCLUDED.store_url;

-- Enable Realtime for instant updates when admin changes version
ALTER PUBLICATION supabase_realtime ADD TABLE app_version_config;
