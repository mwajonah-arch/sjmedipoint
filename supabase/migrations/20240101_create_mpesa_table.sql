-- ============================================================
-- M-Pesa Checkout Tracking Table
-- This table stores M-Pesa STK push requests and their results
-- ============================================================

create table if not exists public.mpesa_checkouts (
  id bigserial primary key,
  checkout_request_id text unique not null,
  merchant_request_id text,
  phone_number text not null,
  amount numeric(10,2) not null,
  account_relation text default 'MedipointPOS',
  transaction_description text default 'Payment for medicines',
  result_code integer, -- 0 = success, other values = various errors
  result_description text,
  mpesa_receipt_number text, -- Unique transaction ID from M-Pesa
  transaction_date timestamp with time zone, -- When transaction completed
  status text default 'pending', -- pending, completed, failed
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.mpesa_checkouts enable row level security;

-- Allow anonymous inserts (for when frontend creates checkout requests)
create policy "Allow anon insert mpesa checkouts" on public.mpesa_checkouts
  for insert to anon with check (true);

-- Allow anonymous updates (for when callback updates the record)
create policy "Allow anon update mpesa checkouts" on public.mpesa_checkouts
  for update to anon using (true) with check (true);

-- Allow selects (for checking status)
create policy "Allow anon select mpesa checkouts" on public.mpesa_checkouts
  for select to anon using (true);

-- Create indexes for better query performance
create index if not exists idx_mpesa_checkouts_checkout_id on public.mpesa_checkouts(checkout_request_id);
create index if not exists idx_mpesa_checkouts_phone on public.mpesa_checkouts(phone_number);
create index if not exists idx_mpesa_checkouts_status on public.mpesa_checkouts(status);
create index if not exists idx_mpesa_checkouts_created_at on public.mpesa_checkouts(created_at);

-- Comment on table and columns
comment on table public.mpesa_checkouts is 'Stores M-Pesa STK push requests and their callback results';
comment on column public.mpesa_checkouts.checkout_request_id is 'Unique ID from M-Pesa STK push request';
comment on column public.mpesa_checkouts.merchant_request_id is 'Merchant request ID from M-Pesa';
comment on column public.mpesa_checkouts.phone_number is 'Customer phone number';
comment on column public.mpesa_checkouts.amount is 'Transaction amount';
comment on column public.mpesa_checkouts.account_relation is 'Account reference (Till number or business name)';
comment on column public.mpesa_checkouts.transaction_description is 'Description of transaction';
comment on column public.mpesa_checkouts.result_code is 'Result code from M-Pesa (0 = success)';
comment on column public.mpesa_checkouts.result_description is 'Result description from M-Pesa';
comment on column public.mpesa_checkouts.mpesa_receipt_number is 'M-Pesa receipt number (transaction ID)';
comment on column public.mpesa_checkouts.transaction_date is 'Date/time when transaction completed';
comment on column public.mpesa_checkouts.status is 'Status of transaction: pending, completed, failed';