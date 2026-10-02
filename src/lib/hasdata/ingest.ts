import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CREDITS_PER_LISTING_REQUEST,
  getPropertyDetails,
  searchListings,
  type HasDataListingType,
  type HasDataParams,
  type HasDataProvider,
} from "./client";
import {
  extractListings,
  normalizeDetails,
  normalizeListing,
  type ListingType,
  type NormalizedProperty,
} from "./normalize";

/** Parallel detail requests. HasData handles concurrency; this keeps a run well under 300s. */
const DETAIL_CONCURRENCY = 5;
/** Hard cap on detail fetches per run (each costs CREDITS_PER_LISTING_REQUEST). */
export const MAX_DETAILS_PER_RUN = 50;

const TO_HASDATA_TYPE: Record<ListingType, HasDataListingType> = {
  for_sale: "forSale",
  for_rent: "forRent",
  sold: "sold",
};

export interface ImportRequest {
  provider: HasDataProvider;
  keyword: string;
  listingType: ListingType;
  filters?: HasDataParams;
  maxPages?: number;
  /** Also fetch full details for new listings from this run (10 credits each, capped). */
  withDetails?: boolean;
  importSourceId?: string;
  triggeredBy?: string;
}

export interface ImportResult {
  jobId: string;
  status: "succeeded" | "failed";
  pagesFetched: number;
  listingsFound: number;
  listingsUpserted: number;
  detailsFetched: number;
  creditsUsed: number;
  error?: string;
}

/**
 * Pulls listing pages from HasData, normalizes them, and upserts into
 * `properties` (deduped on provider + provider_id). Every run is logged
 * to `import_jobs`.
 */
export async function runImport(req: ImportRequest): Promise<ImportResult> {
  const db = createAdminClient();
  const maxPages = Math.min(Math.max(req.maxPages ?? 1, 1), 20);

  const { data: job, error: jobError } = await db
    .from("import_jobs")
    .insert({
      import_source_id: req.importSourceId ?? null,
      provider: req.provider,
      params: {
        keyword: req.keyword,
        listingType: req.listingType,
        filters: req.filters ?? {},
        maxPages,
        withDetails: !!req.withDetails,
      },
      triggered_by: req.triggeredBy ?? null,
    })
    .select("id")
    .single();
  if (jobError) throw jobError;

  const stats = { pagesFetched: 0, listingsFound: 0, listingsUpserted: 0, detailsFetched: 0 };
  const seenIds: string[] = [];
  let error: string | undefined;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const response = await searchListings({
        provider: req.provider,
        keyword: req.keyword,
        type: TO_HASDATA_TYPE[req.listingType],
        page,
        filters: req.filters,
      });
      stats.pagesFetched++;

      const rows = extractListings(response)
        .map((item) => normalizeListing(req.provider, req.listingType, item))
        .filter((r): r is NormalizedProperty => r !== null);
      stats.listingsFound += rows.length;
      if (rows.length === 0) break;

      const ids = await upsertProperties(rows);
      stats.listingsUpserted += ids.length;
      seenIds.push(...ids);
    }

    if (req.withDetails && seenIds.length > 0) {
      const enriched = await enrichPending({ ids: seenIds });
      stats.detailsFetched = enriched.fetched;
      if (enriched.failed > 0) error = `${enriched.failed} detail fetches failed`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const result: ImportResult = {
    jobId: job.id,
    status: error && stats.listingsUpserted === 0 ? "failed" : "succeeded",
    ...stats,
    creditsUsed: (stats.pagesFetched + stats.detailsFetched) * CREDITS_PER_LISTING_REQUEST,
    error,
  };

  await db
    .from("import_jobs")
    .update({
      status: result.status,
      pages_fetched: result.pagesFetched,
      listings_found: result.listingsFound,
      listings_upserted: result.listingsUpserted,
      details_fetched: result.detailsFetched,
      credits_used: result.creditsUsed,
      error: result.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (req.importSourceId) {
    await db
      .from("import_sources")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", req.importSourceId);
  }

  return result;
}

async function upsertProperties(rows: NormalizedProperty[]) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // A page can repeat a listing; Postgres rejects duplicate keys in one upsert.
  const unique = [
    ...new Map(rows.map((r) => [`${r.provider}:${r.provider_id}`, r])).values(),
  ];

  // Listings that already have full details must not be overwritten with the
  // sparser search data (thumbnail photos, null year_built, ...). For those,
  // refresh only the fields that change between searches.
  const { data: enrichedRows, error: lookupError } = await db
    .from("properties")
    .select("provider_id")
    .eq("provider", unique[0].provider)
    .in("provider_id", unique.map((r) => r.provider_id))
    .not("details_fetched_at", "is", null);
  if (lookupError) throw lookupError;
  const enriched = new Set((enrichedRows ?? []).map((r) => r.provider_id));

  // Each batch has identical keys, so PostgREST never fills missing columns with NULL.
  const fresh = unique
    .filter((r) => !enriched.has(r.provider_id))
    .map((r) => ({ ...r, is_active: true, last_seen_at: now, updated_at: now }));
  const refreshed = unique
    .filter((r) => enriched.has(r.provider_id))
    .map((r) => ({
      provider: r.provider,
      provider_id: r.provider_id,
      url: r.url,
      listing_type: r.listing_type,
      status: r.status,
      price: r.price,
      days_on_market: r.days_on_market,
      raw: r.raw,
      is_active: true,
      last_seen_at: now,
      updated_at: now,
    }));

  const ids: string[] = [];
  for (const batch of [fresh, refreshed]) {
    if (batch.length === 0) continue;
    const { data, error } = await db
      .from("properties")
      .upsert(batch, { onConflict: "provider,provider_id" })
      .select("id");
    if (error) throw error;
    ids.push(...(data ?? []).map((r) => r.id as string));
  }
  return ids;
}

/** Fetches + stores the full detail page for one property. Returns false if HasData had nothing. */
export async function enrichProperty(property: {
  id: string;
  provider: HasDataProvider;
  url: string | null;
}) {
  if (!property.url) return false;
  const response = await getPropertyDetails(property.provider, property.url);
  const update = normalizeDetails(response);
  if (!update) return false;

  const db = createAdminClient();
  const { error } = await db
    .from("properties")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", property.id);
  if (error) throw error;
  return true;
}

/**
 * Enriches listings that have no details yet, newest first.
 * Pass `ids` to restrict to specific properties (e.g. the ones an import just touched).
 */
export async function enrichPending({
  ids,
  limit = MAX_DETAILS_PER_RUN,
}: { ids?: string[]; limit?: number } = {}) {
  const db = createAdminClient();
  let query = db
    .from("properties")
    .select("id, provider, url")
    .is("details_fetched_at", null)
    .eq("is_active", true)
    .not("url", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(Math.min(limit, MAX_DETAILS_PER_RUN));
  if (ids) query = query.in("id", ids.slice(0, 500));

  const { data: pending, error } = await query;
  if (error) throw error;

  let fetched = 0;
  let failed = 0;
  const queue = [...(pending ?? [])];
  await Promise.all(
    Array.from({ length: DETAIL_CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          if (await enrichProperty(p)) fetched++;
          else failed++;
        } catch (e) {
          failed++;
          console.error(`[hasdata] details failed for ${p.id}:`, e);
        }
      }
    }),
  );

  return { attempted: pending?.length ?? 0, fetched, failed };
}

/** Runs every active saved import source. Used by the cron route. */
export async function runAllImportSources() {
  const db = createAdminClient();
  const { data: sources, error } = await db
    .from("import_sources")
    .select("id, provider, keyword, listing_type, filters, max_pages")
    .eq("is_active", true);
  if (error) throw error;

  const results: ImportResult[] = [];
  // Sequential on purpose: keeps HasData concurrency and credit spend predictable.
  for (const s of sources ?? []) {
    results.push(
      await runImport({
        provider: s.provider,
        keyword: s.keyword,
        listingType: s.listing_type,
        filters: s.filters as HasDataParams,
        maxPages: s.max_pages,
        importSourceId: s.id,
      }),
    );
  }

  // Then fill in full details for the newest listings still missing them.
  const details = await enrichPending();
  return { results, details };
}
