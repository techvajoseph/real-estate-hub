-- Personal workspaces are separate from privileged platform roles.
create table public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('buyer','seller','landlord')),
  created_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
create policy "workspaces: owner" on public.workspaces for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.can_manage_portfolio() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspaces where user_id = (select auth.uid()) and role in ('seller','landlord'))
    or exists(select 1 from public.profiles where id = (select auth.uid()) and role in ('agent','admin'));
$$;

-- Private owner-managed inventory. Imported marketplace properties stay independent.
create table public.portfolio_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  address text not null check (length(address) between 1 and 240),
  city text not null check (length(city) between 1 and 120),
  kind text not null check (kind in ('sale','rent')),
  price numeric not null check (price >= 0 and price <= 10000000000),
  beds integer not null default 0 check (beds between 0 and 100),
  baths numeric not null default 0 check (baths between 0 and 100),
  sqft integer not null default 0 check (sqft between 0 and 100000000),
  status text not null default 'draft' check (status in ('draft','active','under_offer','sold','rented','archived')),
  photo text not null default '',
  created_at timestamptz not null default now(),
  constraint listing_status_kind check ((status <> 'rented' or kind = 'rent') and (status not in ('sold','under_offer') or kind = 'sale'))
);
create table public.workspace_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  contact text not null default '' check (length(contact) <= 120),
  amount numeric not null check (amount >= 0 and amount <= 10000000000),
  kind text not null check (kind in ('sale','rent')),
  stage text not null default 'lead' check (stage in ('lead','viewing','offer','negotiating','closed','lost')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint deal_close_date check ((stage = 'closed') = (closed_at is not null))
);
create table public.workspace_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  location text not null default '' check (length(location) <= 240),
  starts_at timestamptz not null,
  completed boolean not null default false
);
create table public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.portfolio_listings enable row level security;
alter table public.workspace_deals enable row level security;
alter table public.workspace_appointments enable row level security;
alter table public.workspace_tasks enable row level security;
create policy "portfolio: owner read" on public.portfolio_listings for select to authenticated using (user_id = (select auth.uid()));
create policy "portfolio: owner insert" on public.portfolio_listings for insert to authenticated with check (user_id = (select auth.uid()) and public.can_manage_portfolio());
create policy "portfolio: owner update" on public.portfolio_listings for update to authenticated using (user_id = (select auth.uid()) and public.can_manage_portfolio()) with check (user_id = (select auth.uid()) and public.can_manage_portfolio());
create policy "deals: owner" on public.workspace_deals for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "appointments: owner" on public.workspace_appointments for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tasks: owner" on public.workspace_tasks for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index portfolio_owner_idx on public.portfolio_listings(user_id, created_at desc);
create index deals_owner_idx on public.workspace_deals(user_id, created_at desc);
create index appointments_owner_idx on public.workspace_appointments(user_id, starts_at);
create index tasks_owner_idx on public.workspace_tasks(user_id, created_at desc);
