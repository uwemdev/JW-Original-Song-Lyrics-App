-- Create a storage bucket for images
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do nothing;

-- Set up storage policies
create policy "Images are publicly accessible." 
on storage.objects for select 
using (bucket_id = 'images');

create policy "Authenticated users can upload images." 
on storage.objects for insert 
with check (bucket_id = 'images' and auth.role() = 'authenticated');

create policy "Authenticated users can update their images." 
on storage.objects for update 
using (bucket_id = 'images' and auth.role() = 'authenticated');

create policy "Authenticated users can delete their images." 
on storage.objects for delete 
using (bucket_id = 'images' and auth.role() = 'authenticated');
