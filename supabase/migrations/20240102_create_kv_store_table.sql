-- ============================================================
-- Key-Value Store for Medipoint POS
-- This table stores application state shared across devices
-- ============================================================

create table if not exists public.kv_store (
  id bigserial primary key,
  key text unique not null,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.kv_store enable row level security;

-- Allow anonymous inserts (for when frontend creates new records)
create policy "Allow anon insert kv store" on public.kv_store
  for insert to anon with check (true);

-- Allow anonymous updates (for when frontend updates existing records)
create policy "Allow anon update kv store" on public.kv_store
  for update to anon using (true) with check (true);

-- Allow selects (for reading values)
create policy "Allow anon select kv store" on public.kv_store
  for select to anon using (true);

-- Allow deletes (for cleanup if needed)
create policy "Allow anon delete kv store" on public.kv_store
  for delete to anon using (true);

-- Create indexes for better query performance
create index if not exists idx_kv_store_key on public.kv_store(key);
create index if not exists idx_kv_store_updated_at on public.kv_store(updated_at);