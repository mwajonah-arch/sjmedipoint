-- ============================================================
-- Amani Pharmacy POS — one-time Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query,
-- then click "Run". You only need to do this once.
-- ============================================================

-- 1. The main table the app reads and writes to.
--    It stores four rows: inventory, sales, staff, settings --
--    each one holding the entire list as JSON.
create table if not exists public.kv_store (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security, then allow the app's public
--    "anon" key to read and write. This is a shared, no-login
--    till system (staff sign in with a PIN inside the app, not
--    through Supabase), so the anon key intentionally has full
--    access -- treat that key like a shared password and only
--    share this app's link with your own staff.
alter table public.kv_store enable row level security;

drop policy if exists "Allow anon read" on public.kv_store;
create policy "Allow anon read" on public.kv_store
  for select to anon using (true);

drop policy if exists "Allow anon write" on public.kv_store;
create policy "Allow anon write" on public.kv_store
  for insert to anon with check (true);

drop policy if exists "Allow anon update" on public.kv_store;
create policy "Allow anon update" on public.kv_store
  for update to anon using (true) with check (true);

-- 3. Table for tracking M-Pesa transactions
create table if not exists public.mpesa_checkouts (
  id                 bigserial primary key,
  checkout_request_id text unique not null,
  merchant_request_id text,
  phone_number       text not null,
  amount             numeric not null,
  account_reference  text,
  transaction_desc   text,
  status             text default 'pending', -- pending, completed, failed, cancelled
  result_code        integer,
  result_description text,
  mpesa_receipt_number text,
  balance            numeric,
  transaction_date   timestamp with time zone,
  created_at         timestamp with time zone default now(),
  updated_at         timestamp with time zone default now()
);

-- Enable RLS on the M-Pesa table
alter table public.mpesa_checkouts enable row level security;

drop policy if exists "Allow anon read mpesa_checkouts" on public.mpesa_checkouts;
create policy "Allow anon read mpesa_checkouts" on public.mpesa_checkouts
  for select to anon using (true);

drop policy if exists "Allow anon insert mpesa_checkouts" on public.mpesa_checkouts;
create policy "Allow anon insert mpesa_checkouts" on public.mpesa_checkouts
  for insert to anon with check (true);

drop policy if exists "Allow anon update mpesa_checkouts" on public.mpesa_checkouts;
create policy "Allow anon update mpesa_checkouts" on public.mpesa_checkouts
  for update to anon using (true) with check (true);

-- 4. Turn on realtime so every till updates instantly when any
--    other till makes a sale or edits inventory.
-- Safely add tables to the supabase_realtime publication (ignore if already present)
do $$
begin
    begin
        alter publication supabase_realtime add table public.kv_store;
    exception
        when duplicate_object then null; -- ignore if already in publication
    end;
    begin
        alter publication supabase_realtime add table public.mpesa_checkouts;
    exception
        when duplicate_object then null; -- ignore if already in publication
    end;
end $$;

-- 5. Done. Next: Project Settings → API → copy the Project URL and
--    the "anon public" key into config.js.