import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HOME_CATEGORIES, type MapPoint, type PropertyCard } from "./listing-format";
import type { PropertyFilters } from "./property-filters";

export * from "./listing-format";
export * from "./property-filters";

/** Divisible by 3 and 4 so the listing grid ends on a full row. */
export const PAGE_SIZE = 36;
/** Upper bound on pins sent to the map in one response. */
export const MAP_POINT_LIMIT = 1000;


const CARD_COLUMNS =
  "id, provider, listing_type, price, beds, baths, sqft, home_type, address_line, city, state, zip, photos, latitude, longitude, broker_name, days_on_market";

export function hasBounds(f: PropertyFilters): f is PropertyFilters & Record<"north" | "south" | "east" | "west", number> {
  return f.north !== undefined && f.south !== undefined && f.east !== undefined && f.west !== undefined;
}

// Supabase's builder generics are too deep to constrain against, so the
// filter chain runs on a minimal structural view and returns the caller's type.
interface FilterChain {
  ilike(column: string, pattern: string): FilterChain;
  eq(column: string, value: unknown): FilterChain;
  gte(column: string, value: unknown): FilterChain;
  lte(column: string, value: unknown): FilterChain;
  or(filters: string): FilterChain;
}

function applyFilters<Q>(builder: Q, filters: PropertyFilters): Q {
  let query = builder as unknown as FilterChain;
  if (filters.q) {
    // Strip PostgREST/LIKE metacharacters from user input.
    const term = filters.q.replace(/[%_,()\\*]/g, " ").trim();
    if (term) query = query.ilike("search_text", `%${term}%`);
  }
  if (filters.type) query = query.eq("listing_type", filters.type);
  if (filters.provider) query = query.eq("provider", filters.provider);
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.minBeds !== undefined) query = query.gte("beds", filters.minBeds);
  if (filters.minBaths !== undefined) query = query.gte("baths", filters.minBaths);
  if (filters.minSqft !== undefined) query = query.gte("sqft", filters.minSqft);
  if (filters.maxSqft !== undefined) query = query.lte("sqft", filters.maxSqft);
  if (filters.homeTypes?.length) {
    // PostgREST uses * as the LIKE wildcard inside or() filters.
    const clauses = filters.homeTypes.flatMap((c) =>
      HOME_CATEGORIES[c].patterns.map((p) => `home_type.ilike.${p.replaceAll("%", "*")}`),
    );
    query = query.or(clauses.join(","));
  }
  if (hasBounds(filters)) {
    query = query
      .gte("latitude", filters.south)
      .lte("latitude", filters.north)
      .gte("longitude", filters.west)
      .lte("longitude", filters.east);
  }
  return query as unknown as Q;
}

export async function searchProperties(filters: PropertyFilters) {
  const supabase = await createClient();
  let query = applyFilters(supabase.from("properties").select(CARD_COLUMNS, { count: "exact" }), filters);

  const order = {
    newest: ["last_seen_at", false],
    price_desc: ["price", false],
    price_asc: ["price", true],
    beds_desc: ["beds", false],
    baths_desc: ["baths", false],
    sqft_desc: ["sqft", false],
  } as const;
  const [column, ascending] = order[filters.sort];
  query = query.order(column, { ascending, nullsFirst: false }).order("id");

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return {
    properties: (data ?? []) as PropertyCard[],
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

/** Pins for every matching listing (not just the current page), with valid coordinates only. */
export async function searchMapPoints(filters: PropertyFilters): Promise<MapPoint[]> {
  const supabase = await createClient();
  const base = supabase
    .from("properties")
    .select("id, price, listing_type, latitude, longitude, beds, baths, sqft, home_type, address_line, city, state, zip")
    .not("latitude", "is", null)
    .not("longitude", "is", null);
  const { data, error } = await applyFilters(base, filters)
    .order("last_seen_at", { ascending: false })
    .limit(MAP_POINT_LIMIT);
  if (error) throw error;

  return ((data ?? []) as MapPoint[]).filter(
    (p): p is MapPoint =>
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      Math.abs(p.latitude) <= 90 &&
      Math.abs(p.longitude) <= 180 &&
      // (0,0) is a classic "missing geocode" sentinel, never a real US listing.
      !(p.latitude === 0 && p.longitude === 0),
  );
}

export async function getProperty(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

