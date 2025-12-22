-- Create the storage bucket 'products'
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Set up RLS policies for the 'products' bucket

-- 1. Allow public read access (anyone can view product images)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'products' );

-- 2. Allow authenticated users to upload images (Restricted to 'products' bucket)
-- You might want to restrict this further to only 'admin' or 'owner' roles in a real production env.
create policy "Authenticated Upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'products' );

-- 3. Allow authenticated users to update/delete their own images (or all images if they are admins)
create policy "Authenticated Update/Delete"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'products' );

create policy "Authenticated Delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'products' );
