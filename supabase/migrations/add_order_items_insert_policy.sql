-- Add INSERT policy for order_items
-- This allows users to insert order items for their own orders

-- Drop if exists
drop policy if exists "Users can insert own order items" on public.order_items;

-- Create INSERT policy
create policy "Users can insert own order items" 
on public.order_items 
for insert 
with check (
  exists (
    select 1 
    from public.orders 
    where id = order_items.order_id 
    and user_id = auth.uid()
  )
);
