-- ============================================================
-- Amani Pharmacy POS — one-time Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query,
-- then click "Run". You only need to do this once.
--
-- M-Pesa's table (mpesa_transactions) is created separately by
-- mpesa-setup.sql — don't duplicate it here.
-- ============================================================

-- 1. The single table the whole app reads and writes to.
--    It stores several rows (inventory, sales, staff, settings,
--    inventoryLog) — each one holding the entire list as JSON.
create table if not exists public.kv_store (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security, then allow the app's public
--    "anon" key to read and write. Staff PINs live in a separate,
--    fully locked-down table (staff_pins) — never in here.
alter table public.kv_store enable row level security;

create policy "Allow anon read" on public.kv_store
  for select to anon using (true);

create policy "Allow anon write" on public.kv_store
  for insert to anon with check (true);

create policy "Allow anon update" on public.kv_store
  for update to anon using (true) with check (true);

-- 3. Turn on realtime so every till updates instantly when any
--    other till makes a sale or edits inventory.
alter publication supabase_realtime add table public.kv_store;

-- Done. Next: run mpesa-setup.sql for M-Pesa, and the staff_pins
-- migration for locked-down staff logins, if you haven't already.
