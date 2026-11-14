-- Migration: 14_community_realtime.sql
-- Enables Realtime logical replication for community chat and messaging tables

DO $$
BEGIN
  -- Add community_group_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_group_messages;
  END IF;

  -- Add community_direct_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_direct_messages;
  END IF;

  -- Add community_direct_threads
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_direct_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_direct_threads;
  END IF;

  -- Add community_profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_profiles;
  END IF;

  -- Add community_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reports;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL so deletes and updates broadcast full row data
ALTER TABLE public.community_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.community_direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.community_direct_threads REPLICA IDENTITY FULL;
ALTER TABLE public.community_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.community_reports REPLICA IDENTITY FULL;
