-- Run this in your Supabase SQL Editor

create table if not exists addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null, -- e.g. "Casa", "Trabajo"
  recipient_name text not null,
  street text not null,
  city text not null,
  state text,
  zip_code text,
  country text default 'Colombia',
  phone text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table addresses enable row level security;

-- Policies
create policy "Users can view their own addresses" on addresses for select using (auth.uid() = user_id);
create policy "Users can insert their own addresses" on addresses for insert with check (auth.uid() = user_id);
create policy "Users can update their own addresses" on addresses for update using (auth.uid() = user_id);
create policy "Users can delete their own addresses" on addresses for delete using (auth.uid() = user_id);
