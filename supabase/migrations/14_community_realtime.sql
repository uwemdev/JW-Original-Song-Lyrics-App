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

-- Ensure Admins have full DELETE permissions on all community chat tables for storage management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete all group messages' AND tablename = 'community_group_messages'
  ) THEN
    CREATE POLICY "Admins can delete all group messages"
      ON public.community_group_messages FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete all direct messages' AND tablename = 'community_direct_messages'
  ) THEN
    CREATE POLICY "Admins can delete all direct messages"
      ON public.community_direct_messages FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete all direct threads' AND tablename = 'community_direct_threads'
  ) THEN
    CREATE POLICY "Admins can delete all direct threads"
      ON public.community_direct_threads FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;
