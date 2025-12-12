-- Create order_items table if it doesn't exist
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  quantity integer not null default 1,
  price decimal(10,2) not null,
  size text,
  color text,
  product_name text, -- Cache name in case product is deleted
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table order_items enable row level security;

-- Policies
create policy "Users can view their own order items" 
on order_items for select 
using (
  auth.uid() in (
    select user_id from orders where id = order_items.order_id
  )
);

create policy "Users can insert their own order items" 
on order_items for insert 
with check (
  auth.uid() in (
    select user_id from orders where id = order_items.order_id
  )
);
