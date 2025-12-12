alter table reviews add column if not exists reply text;
alter table reviews add column if not exists replied_at timestamp with time zone;
