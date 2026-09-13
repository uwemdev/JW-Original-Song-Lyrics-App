-- 03_notifications.sql
-- Creates the notifications table and triggers to automate event tracking for the mobile app

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('new_song', 'song_edited', 'new_category')),
  title text NOT NULL,
  message text,
  reference_id uuid, -- links to song_id or category_id
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS is enabled and allow public read access
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on notifications" 
ON public.notifications
FOR SELECT 
USING (true);

-- Allow authenticated admins to manage notifications (if needed)
CREATE POLICY "Allow admin full access on notifications" 
ON public.notifications
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);


-- 2. Trigger Function for Categories
CREATE OR REPLACE FUNCTION public.handle_new_category()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, reference_id)
  VALUES (
    'new_category',
    'New Category Added',
    'The category "' || NEW.name || '" is now available.',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After inserting a new category
DROP TRIGGER IF EXISTS on_category_created ON public.categories;
CREATE TRIGGER on_category_created
  AFTER INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_category();


-- 3. Trigger Function for Songs
CREATE OR REPLACE FUNCTION public.handle_song_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.is_published = true) THEN
      INSERT INTO public.notifications (type, title, message, reference_id)
      VALUES (
        'new_song',
        'New Song Added',
        '"' || NEW.title || '" has just been released!',
        NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- Case A: Song was just published
    IF (OLD.is_published = false AND NEW.is_published = true) THEN
      INSERT INTO public.notifications (type, title, message, reference_id)
      VALUES (
        'new_song',
        'New Song Published',
        '"' || NEW.title || '" is now available!',
        NEW.id
      );
    
    -- Case B: Song was already published, and major fields changed
    ELSIF (OLD.is_published = true AND NEW.is_published = true) THEN
      IF (OLD.title IS DISTINCT FROM NEW.title OR OLD.lyrics IS DISTINCT FROM NEW.lyrics OR OLD.writeup IS DISTINCT FROM NEW.writeup) THEN
        INSERT INTO public.notifications (type, title, message, reference_id)
        VALUES (
          'song_edited',
          'Song Updated',
          'Updates have been made to "' || NEW.title || '".',
          NEW.id
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After inserting or updating a song
DROP TRIGGER IF EXISTS on_song_changes ON public.songs;
CREATE TRIGGER on_song_changes
  AFTER INSERT OR UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_song_changes();
