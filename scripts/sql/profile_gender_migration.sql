-- Add gender column to profiles table
alter table public.profiles 
add column if not exists gender text check (gender in ('male', 'female', 'other'));

-- Update RLS policies if necessary (usually existing update policy covers it)
-- Just in case, ensure update policy allows users to update their own profile
-- (Assuming standard policy: create policy "Users can update own profile" on profiles for update using (auth.uid() = id);)
