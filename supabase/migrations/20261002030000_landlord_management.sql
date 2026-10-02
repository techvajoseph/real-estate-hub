-- Landlord CRUD, lease details, and a private rental ledger.
alter table public.portfolio_listings
  add column tenant_name text not null default '' check (length(tenant_name) <= 120),
  add column tenant_email text not null default '' check (length(tenant_email) <= 254),
  add column tenant_phone text not null default '' check (length(tenant_phone) <= 40),
  add column lease_start date,
  add column lease_end date,
  add column notes text not null default '' check (length(notes) <= 3000),
  add column source_property_id uuid references public.properties(id) on delete set null,
  add constraint portfolio_lease_dates check (lease_end is null or lease_start is null or lease_end >= lease_start),
  add constraint portfolio_owner_identity unique (id, user_id);

create policy "portfolio: owner delete" on public.portfolio_listings
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_manage_portfolio());

create table public.rental_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null,
  kind text not null check (kind in ('rent','expense')),
  description text not null check (length(description) between 1 and 200),
  amount numeric not null check (amount > 0 and amount <= 10000000000),
  status text not null default 'paid' check (status in ('paid','pending')),
  occurred_on date not null,
  created_at timestamptz not null default now(),
  foreign key (property_id, user_id) references public.portfolio_listings(id, user_id) on delete cascade
);
alter table public.rental_transactions enable row level security;
create policy "rental ledger: owner read" on public.rental_transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "rental ledger: owner insert" on public.rental_transactions
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.can_manage_portfolio()
    and exists(select 1 from public.portfolio_listings p where p.id = property_id and p.user_id = (select auth.uid()) and p.kind = 'rent')
  );
create policy "rental ledger: owner update" on public.rental_transactions
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_manage_portfolio())
  with check (
    user_id = (select auth.uid()) and public.can_manage_portfolio()
    and exists(select 1 from public.portfolio_listings p where p.id = property_id and p.user_id = (select auth.uid()) and p.kind = 'rent')
  );
create policy "rental ledger: owner delete" on public.rental_transactions
  for delete to authenticated using (user_id = (select auth.uid()) and public.can_manage_portfolio());
create index rental_transactions_owner_date on public.rental_transactions(user_id, occurred_on);
create unique index portfolio_unique_source_per_owner on public.portfolio_listings(user_id, source_property_id) where source_property_id is not null;
