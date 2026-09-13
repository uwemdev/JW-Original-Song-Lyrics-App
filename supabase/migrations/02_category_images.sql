-- Add image_url column to categories for thumbnail support
alter table public.categories add column if not exists image_url text;
