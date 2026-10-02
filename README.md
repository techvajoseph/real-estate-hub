# Real Estate Sol

Real estate marketplace and member portal. Listings are scraped from Zillow and Redfin through [HasData](https://hasdata.com), stored in Supabase, and searched from there. HasData is never called on a user's page view.

**Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth, RLS), Tailwind CSS v4, Vercel (hosting and cron).

## Architecture

```
Admin "Import" page ─┐
                     ├─► runImport() ─► HasData /scrape/{zillow|redfin}/listing (paged)
Vercel Cron (daily) ─┘        │
                              ├─► normalizeListing()  → one schema for every provider
                              ├─► upsert properties   (dedupe on provider + provider_id)
                              └─► import_jobs log     (pages, listings, credits, errors)

Visitors ─► /properties (filters in the URL) ─► Supabase (RLS: public read)
Members  ─► /dashboard  (favorites, saved searches; RLS: owner only)
```

| Path | Purpose |
|---|---|
| `src/lib/hasdata/client.ts` | HasData REST client: `x-api-key` auth, timeout, retry on 429/5xx |
| `src/lib/hasdata/normalize.ts` | Maps raw HasData listings to `properties` rows |
| `src/lib/hasdata/ingest.ts` | Import pipeline: paging, upserts, job logging, scheduled sources |
| `src/app/api/admin/import` | `POST`, admin-only one-off import |
| `src/app/api/cron/import` | `GET`, re-runs all active `import_sources` (needs `CRON_SECRET`) |
| `src/lib/properties.ts` | Marketplace search, filtering and sorting |
| `supabase/migrations/` | Schema and RLS policies |

## Setup

1. **Install:** `npm install`
2. **Supabase:** create a project at supabase.com, then:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npm run db:push            # applies supabase/migrations
   ```
3. **Env:** `cp .env.example .env.local` and fill in the values.
4. **Run:** `npm run dev` and open http://localhost:3000
5. **Make yourself admin:** sign up in the app, then in the Supabase SQL editor run:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
6. **Import listings:** go to `/admin/import`, choose Zillow, enter "Austin, TX" with 1 page (costs 10 credits).

### Check HasData's response shape (do this first)

HasData doesn't publish its response schema, so `normalize.ts` tries several likely field names. Pull a real sample and adjust the mappings to match:

```bash
npm run hasdata:sample -- zillow "Austin, TX" forSale
npm run hasdata:sample -- redfin "Austin, TX" forSale
```

Raw JSON is saved to `samples/` (gitignored). The full raw listing is also stored in `properties.raw`, so data from earlier imports can be backfilled after a mapping changes.

### Supabase Auth settings

- **Site URL / Redirect URLs:** add `http://localhost:3000/auth/confirm` and your production URL.
- Email confirmation links land on `/auth/confirm`.

## Deploy (Vercel)

1. Import the repo in Vercel and add every variable from `.env.example`.
2. `vercel.json` schedules `/api/cron/import` daily at 06:00 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
3. Import routes set `maxDuration = 300`. Keep `max_pages` per source modest: each page is one HasData request taking roughly 5–20s.

## Credits and cost

Each HasData listing request costs **10 credits**, and every import job records `credits_used`.
Daily cron cost ≈ `sum(max_pages of active sources) × 10` credits.

## Legal note

Zillow and Redfin restrict commercial redistribution of their listing data, and much of it is MLS-licensed. Get a legal review before publicly redisplaying scraped listings. An MLS/IDX feed is the compliant long-term source, and the `provider` column is there so one can be added alongside.

## Developer tooling (optional)

HasData's MCP server and agent skill let AI coding agents query HasData directly during development. They are not used at runtime.

```bash
claude mcp add --transport http hasdata "https://mcp.hasdata.com/mcp?apis=zillow,redfin" --header "x-api-key: <key>"
```

## SOL dashboard

- `/dashboard`: authenticated personal workspace with Buyer, Seller, and Landlord modes.
- `/dashboard/preview`: public interactive sample workspace. Add `?role=buyer` or `?role=landlord` to open a particular preview. Preview edits are kept only in memory.
- Buyer: saved homes/searches, private deal tracking, viewing plans, next-step tasks, and activity analytics.
- Seller: private property inventory, status and price editing, a deal pipeline, sales volume, and CSV export.
- Landlord: a dedicated mint dashboard with rental CRUD, tenant and lease details, a rent/expense ledger, occupancy, monthly net income, per-property analytics, reminders, and a calendar.

Apply `supabase/migrations/20261002020000_workspaces.sql` after the existing migrations. It adds owner-scoped tables and row-level security; it does not modify imported marketplace inventory or platform admin roles. Workspace modes are self-selectable, while every record remains owned by its signed-in user.

Inventory records are private management records, not marketplace publications. Deals do not submit offers, and calendar plans do not contact agents or book external appointments. Rental collection, public listing publication, messaging, and electronic contracts are not connected.

Dashboard server actions validate inputs and authenticate each write. RLS also prevents cross-account access and restricts inventory writes to seller/landlord workspaces or existing agent/admin users. A sample workspace cannot write through the production actions.

Validation:
- `npm run lint`
- `npm run build`
- `node --test scripts/dashboard-metrics.test.mjs` (Node 22.18+ supports the TypeScript import)
- Browser coverage: create/edit/filter/export inventory, deal stages, appointments/tasks, role switching, saved-home removal, chart range, modal keyboard behavior, 1440/768/390/320px layouts, and unauthenticated route protection.
- The SQL migration was executed in a temporary local PostgreSQL-compatible test engine, checking buyer restrictions, owner reassignment, cross-account read/write isolation, anonymous access, and state constraints.
- Cloud table availability was verified read-only. A live write test using temporary accounts was blocked by automatic approval review and was not performed.

Design inspiration: the 21st.dev dashboard template collection and its sidebar / metric / table composition, adapted to SOL. Existing shadcn Button and Lucide icons are reused. No paid template was purchased or represented as installed.

### Dedicated landlord workspace

Open `/dashboard/preview?role=landlord` for the interactive preview. Signed-in users select Landlord in their workspace selector; `/dashboard/landlord` also opens the dedicated dashboard when that role is selected.

Apply `supabase/migrations/20261002030000_landlord_management.sql` after the workspace migration to enable lease fields, owner-only deletion, and the rental ledger. This migration has passed local SQL/RLS checks but has not yet been applied to the hosted project. Management controls remain disabled until the schema is available.

The preview features the catalog rental at 77 Commercial St #2922S, Brooklyn. Tenant identities and financial history in the preview are illustrative. An empty authenticated portfolio offers a private draft copy of this rental; importing does not assert ownership or change the public catalog. Public publishing and payment collection are not connected.

Property deletion requires typing DELETE and cascades to the property's ledger. Recorded paid income and expenses drive the analytics; pending entries and future payments are excluded. Workspace changes never grant platform administrator access.

Additional checks: `node scripts/landlord-metrics.test.mjs`; local SQL validation of lease constraints, owner CRUD, cross-owner isolation, and ledger cascade; browser checks for property/ledger CRUD, calendar, reminders, chart filters, role switching, auth redirects, and 320/390/768/1440px layouts. No live tenant or account records were created for testing.
