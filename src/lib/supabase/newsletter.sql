
create table if not exists newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table newsletter_subscribers enable row level security;

-- Allow public to insert (subscribe)
create policy "Allow public insert"
  on newsletter_subscribers for insert
  with check (true);

-- Allow admins to view (owner)
create policy "Allow admins to view"
  on newsletter_subscribers for select
  using (
    auth.uid() in (
      select id from profiles where role = 'owner'
    )
  );
