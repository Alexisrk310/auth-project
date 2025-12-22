-- Ensure reviews table has RLS enabled
alter table reviews enable row level security;

-- Drop existing policies to avoid conflicts/duplication
drop policy if exists "Reviews are public" on reviews;
drop policy if exists "Public can read reviews" on reviews;
drop policy if exists "Users can insert reviews" on reviews;
drop policy if exists "Users can update own reviews" on reviews;
drop policy if exists "Users can delete own reviews" on reviews;

-- Create comprehensive policies

-- 1. Read: Everyone can read reviews
create policy "Public can read reviews" 
on reviews for select 
using (true);

-- 2. Insert: Authenticated users can write reviews
create policy "Users can insert reviews" 
on reviews for insert 
with check (auth.role() = 'authenticated');

-- 3. Update: Users can update their OWN reviews
create policy "Users can update own reviews" 
on reviews for update 
using (auth.uid() = user_id);

-- 4. Delete: Users can delete their OWN reviews
create policy "Users can delete own reviews" 
on reviews for delete 
using (auth.uid() = user_id);
