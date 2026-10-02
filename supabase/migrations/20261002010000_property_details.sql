-- =====================================================================
-- Full property details (HasData /scrape/{provider}/property)
-- Search results give card data; this stores the per-listing detail page.
-- =====================================================================

alter table public.properties
  add column mls_id             text,
  add column agent_name         text,
  add column agent_phone        text,
  add column broker_phone       text,
  add column hoa_fee            text,
  add column highlights         text[] not null default '{}',
  add column details            jsonb,
  add column details_fetched_at timestamptz;

-- Finds listings still waiting for enrichment.
create index properties_details_pending_idx
  on public.properties (last_seen_at desc)
  where details_fetched_at is null and is_active;

alter table public.import_jobs
  add column details_fetched integer not null default 0;
