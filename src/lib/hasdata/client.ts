import "server-only";
import { serverEnv } from "@/lib/env";

const BASE_URL = "https://api.hasdata.com";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

/** HasData charges this many credits per successful listing request. */
export const CREDITS_PER_LISTING_REQUEST = 10;

export type HasDataProvider = "zillow" | "redfin";
/** HasData's own listing-type vocabulary. */
export type HasDataListingType = "forSale" | "forRent" | "sold";

/**
 * Query params in HasData's bracket style, e.g. { "price[min]": 300000, "homeTypes[]": ["house", "condo"] }.
 * Array values are sent as repeated keys.
 */
export type HasDataParams = Record<
  string,
  string | number | boolean | (string | number)[] | undefined
>;

export class HasDataError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "HasDataError";
  }
}

function buildQuery(params: HasDataParams) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, String(v)));
    else qs.append(key, String(value));
  }
  return qs.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Low-level GET against any HasData scraper endpoint, with timeout + retry on 429/5xx. */
export async function hasDataGet<T = unknown>(
  path: string,
  params: HasDataParams,
): Promise<T> {
  const url = `${BASE_URL}${path}?${buildQuery(params)}`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "x-api-key": serverEnv().HASDATA_API_KEY },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    const body = await res.text().catch(() => "");
    throw new HasDataError(
      `HasData ${path} failed with ${res.status}`,
      res.status,
      body.slice(0, 1000),
    );
  }
}

export interface ListingSearchInput {
  provider: HasDataProvider;
  keyword: string;
  type: HasDataListingType;
  page?: number;
  /** Extra provider-specific filters, already in HasData bracket format. */
  filters?: HasDataParams;
}

/** GET /scrape/{zillow|redfin}/listing */
export function searchListings({
  provider,
  keyword,
  type,
  page = 1,
  filters = {},
}: ListingSearchInput) {
  return hasDataGet<Record<string, unknown>>(`/scrape/${provider}/listing`, {
    ...filters,
    keyword,
    type,
    page,
  });
}

/** GET /scrape/{zillow|redfin}/property — full details for one listing URL. */
export function getPropertyDetails(provider: HasDataProvider, url: string) {
  return hasDataGet<Record<string, unknown>>(`/scrape/${provider}/property`, {
    url,
  });
}
