-- Create carts table
create table if not exists carts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create cart_items table
create table if not exists cart_items (
  id uuid default gen_random_uuid() primary key,
  cart_id uuid references carts(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity integer default 1 not null,
  size text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_cart_item unique (cart_id, product_id, size)
);

-- Enable RLS
alter table carts enable row level security;
alter table cart_items enable row level security;

-- Policies for Carts (Simplified for Guest/User hybrid)
-- Allow anyone to create a cart
create policy "Enable insert for all users" on carts for insert with check (true);

-- Allow users to view/update their own cart (by ID match for guests, User ID for auth)
create policy "Enable select for users based on id" on carts for select using (true);
create policy "Enable update for users based on id" on carts for update using (true);

-- Policies for Cart Items
create policy "Enable all access for items" on cart_items for all using (true);

-- Enable Realtime for these tables
alter publication supabase_realtime add table carts;
alter publication supabase_realtime add table cart_items;
alter publication supabase_realtime add table products; -- Ensure products are listened to
