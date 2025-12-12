-- Run this in your Supabase SQL Editor

create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  product_id uuid not null, -- Assuming product IDs are UUIDs, if they are text, change to text
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  username text, -- Optional: cache username to avoid joins if complex
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table reviews enable row level security;

-- Policies
create policy "Reviews are public" on reviews for select using (true);
create policy "Users can insert reviews" on reviews for insert with check (auth.uid() = user_id);
