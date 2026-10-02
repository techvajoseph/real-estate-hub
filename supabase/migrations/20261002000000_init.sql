-- =====================================================================
-- Real Estate Sol — initial schema
-- Profiles/roles, scraped properties, import pipeline, member features
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------
create type public.user_role as enum ('member', 'agent', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'member',
  created_at  timestamptz not null default now()
);

-- Auto-create a profile for every new auth user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Properties (normalized from HasData: Zillow, Redfin, ...)
-- ---------------------------------------------------------------------
create type public.listing_provider as enum ('zillow', 'redfin');
create type public.listing_type as enum ('for_sale', 'for_rent', 'sold');

create table public.properties (
  id              uuid primary key default gen_random_uuid(),
  provider        public.listing_provider not null,
  provider_id     text not null,
  url             text,
  listing_type    public.listing_type not null,
  status          text,
  price           numeric,
  beds            numeric,
  baths           numeric,
  sqft            integer,
  lot_size        numeric,
  year_built      integer,
  home_type       text,
  address_line    text,
  city            text,
  state           text,
  zip             text,
  latitude        double precision,
  longitude       double precision,
  photos          text[] not null default '{}',
  description     text,
  broker_name     text,
  days_on_market  integer,
  raw             jsonb not null,
  is_active       boolean not null default true,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search_text     text generated always as (
    coalesce(address_line, '') || ' ' || coalesce(city, '') || ' ' ||
    coalesce(state, '') || ' ' || coalesce(zip, '')
  ) stored,
  unique (provider, provider_id)
);

create index properties_filter_idx
  on public.properties (listing_type, is_active, price);
create index properties_city_state_idx on public.properties (state, city);
create index properties_zip_idx on public.properties (zip);
create index properties_beds_idx on public.properties (beds);
create index properties_last_seen_idx on public.properties (last_seen_at desc);
create index properties_search_trgm_idx
  on public.properties using gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Import pipeline
-- ---------------------------------------------------------------------
-- Saved searches the cron re-runs on a schedule
create table public.import_sources (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  provider      public.listing_provider not null,
  keyword       text not null,
  listing_type  public.listing_type not null default 'for_sale',
  filters       jsonb not null default '{}',
  max_pages     integer not null default 3 check (max_pages between 1 and 20),
  is_active     boolean not null default true,
  last_run_at   timestamptz,
  created_at    timestamptz not null default now()
);

create type public.import_status as enum ('running', 'succeeded', 'failed');

create table public.import_jobs (
  id                uuid primary key default gen_random_uuid(),
  import_source_id  uuid references public.import_sources (id) on delete set null,
  provider          public.listing_provider not null,
  params            jsonb not null,
  status            public.import_status not null default 'running',
  pages_fetched     integer not null default 0,
  listings_found    integer not null default 0,
  listings_upserted integer not null default 0,
  credits_used      integer not null default 0,
  error             text,
  triggered_by      uuid references auth.users (id) on delete set null,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create index import_jobs_started_idx on public.import_jobs (started_at desc);

-- ---------------------------------------------------------------------
-- Member features
-- ---------------------------------------------------------------------
create table public.favorites (
  user_id      uuid not null references auth.users (id) on delete cascade,
  property_id  uuid not null references public.properties (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  filters     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index saved_searches_user_idx on public.saved_searches (user_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- Writes to properties/import_* happen only via the service-role key
-- on the server, which bypasses RLS.
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.properties     enable row level security;
alter table public.import_sources enable row level security;
alter table public.import_jobs    enable row level security;
alter table public.favorites      enable row level security;
alter table public.saved_searches enable row level security;

-- profiles: users see/update their own row; admins see all.
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Members may only change their name, never their role.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- properties: public marketplace read
create policy "properties: public read" on public.properties
  for select to anon, authenticated
  using (is_active);

-- import tables: admins only
create policy "import_sources: admin all" on public.import_sources
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "import_jobs: admin read" on public.import_jobs
  for select to authenticated
  using ((select public.is_admin()));

-- favorites / saved searches: owner only
create policy "favorites: owner all" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "saved_searches: owner all" on public.saved_searches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
