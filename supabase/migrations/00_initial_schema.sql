-- Create categories table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create songs table
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.categories(id) on delete cascade not null,
  title text not null,
  writeup text,
  lyrics text,
  feature_image_url text,
  mp3_url text,
  sort_order integer default 0,
  is_published boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.categories enable row level security;
alter table public.songs enable row level security;

-- Categories policies
create policy "Categories are viewable by everyone." on public.categories
  for select using (true);

create policy "Categories are insertable by authenticated users only." on public.categories
  for insert with check (auth.role() = 'authenticated');

create policy "Categories are updatable by authenticated users only." on public.categories
  for update using (auth.role() = 'authenticated');

create policy "Categories are deletable by authenticated users only." on public.categories
  for delete using (auth.role() = 'authenticated');

-- Songs policies
create policy "Published songs are viewable by everyone." on public.songs
  for select using (is_published = true or auth.role() = 'authenticated');

create policy "Songs are insertable by authenticated users only." on public.songs
  for insert with check (auth.role() = 'authenticated');

create policy "Songs are updatable by authenticated users only." on public.songs
  for update using (auth.role() = 'authenticated');

create policy "Songs are deletable by authenticated users only." on public.songs
  for delete using (auth.role() = 'authenticated');

-- Create trigger for updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.songs
  for each row execute procedure moddatetime (updated_at);
