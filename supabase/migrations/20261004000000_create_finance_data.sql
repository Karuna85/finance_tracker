create table if not exists public.finance_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  local_import_completed_at timestamptz
);

alter table public.finance_data enable row level security;

create policy "Users can read their own finance data"
  on public.finance_data
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own finance data"
  on public.finance_data
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own finance data"
  on public.finance_data
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
