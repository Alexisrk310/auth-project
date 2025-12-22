-- Create addresses table
drop table if exists public.addresses cascade;
create table public.addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  recipient_name text not null,
  address_line1 text not null,
  neighborhood text,
  city text not null,
  phone text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.addresses enable row level security;

-- Policies (Drop first to allow re-running)
drop policy if exists "Users can view their own addresses" on public.addresses;
create policy "Users can view their own addresses"
  on public.addresses for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own addresses" on public.addresses;
create policy "Users can insert their own addresses"
  on public.addresses for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own addresses" on public.addresses;
create policy "Users can update their own addresses"
  on public.addresses for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own addresses" on public.addresses;
create policy "Users can delete their own addresses"
  on public.addresses for delete
  using ( auth.uid() = user_id );

-- Function to handle default address exclusivity
-- When a user sets an address as default, unset others.
create or replace function handle_default_address()
returns trigger as $$
begin
  if new.is_default then
    update public.addresses
    set is_default = false
    where user_id = new.user_id
      and id <> new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for default address
drop trigger if exists on_address_default_update on public.addresses;
create trigger on_address_default_update
  before insert or update of is_default
  on public.addresses
  for each row
  execute procedure handle_default_address();
