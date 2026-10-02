import { safeHttpUrl } from "../safe-url";
import type { HasDataProvider } from "./client";

/**
 * Maps raw HasData listing objects onto our `properties` row shape.
 *
 * HasData does not publish a response schema, so every field is read through
 * a list of candidate keys. Once a real response has been inspected (see
 * `npm run hasdata:sample`), tighten these lists. The full raw object is
 * always kept in `raw`, so nothing is lost if a mapping is missed.
 */

export type ListingType = "for_sale" | "for_rent" | "sold";

export interface NormalizedProperty {
  provider: HasDataProvider;
  provider_id: string;
  url: string | null;
  listing_type: ListingType;
  status: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lot_size: number | null;
  year_built: number | null;
  home_type: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  description: string | null;
  broker_name: string | null;
  days_on_market: number | null;
  raw: Record<string, unknown>;
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads a dotted path like "address.city". */
function at(obj: Obj, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (!isObj(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function first(obj: Obj, paths: string[]): unknown {
  for (const p of paths) {
    const v = at(obj, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    // "$1,250,000", "1,200 sqft", "$2,400/mo"
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return v.trim() !== "" && Number.isFinite(n) ? n : null;
  }
  return null;
}

const toInt = (v: unknown) => {
  const n = toNumber(v);
  return n === null ? null : Math.round(n);
};

const toStr = (v: unknown) =>
  typeof v === "string" ? v.trim() || null : typeof v === "number" ? String(v) : null;

function toPhotos(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (!Array.isArray(v)) return [];
  return v
    .map((p) => (typeof p === "string" ? p : isObj(p) ? toStr(first(p, ["url", "src", "href"])) : null))
    .map(safeHttpUrl)
    .filter((p): p is string => p !== null);
}

const SQFT_PER_ACRE = 43_560;

/** Zillow reports lots as { lotAreaValue, lotAreaUnits: "sqft" | "acres" }; store sqft. */
function lotSizeSqft(item: Obj): number | null {
  const value = toNumber(first(item, ["lotAreaValue", "lotSize", "lotSize.value"]));
  if (value === null) return null;
  const units = toStr(first(item, ["lotAreaUnits"]))?.toLowerCase();
  return units?.startsWith("acre") ? Math.round(value * SQFT_PER_ACRE) : value;
}

/** Finds the array of listings inside a HasData listing-search response. */
export function extractListings(response: unknown): Obj[] {
  if (Array.isArray(response)) return response.filter(isObj);
  if (!isObj(response)) return [];
  for (const key of ["properties", "listings", "results", "homes", "data"]) {
    const v = response[key];
    if (Array.isArray(v)) return v.filter(isObj);
  }
  return [];
}

export function normalizeListing(
  provider: HasDataProvider,
  listingType: ListingType,
  item: Obj,
): NormalizedProperty | null {
  const url = safeHttpUrl(first(item, ["url", "detailUrl", "link", "propertyUrl"]));
  const providerId =
    toStr(first(item, ["zpid", "id", "propertyId", "listingId", "mlsId"])) ?? url;
  if (!providerId) return null;

  const address = first(item, ["address"]);

  return {
    provider,
    provider_id: providerId,
    url,
    listing_type: listingType,
    status: toStr(first(item, ["status", "homeStatus", "statusText", "listingStatus"])),
    price: toNumber(first(item, ["price", "unformattedPrice", "price.value", "listPrice"])),
    beds: toNumber(first(item, ["beds", "bedrooms", "bedroomCount"])),
    baths: toNumber(first(item, ["baths", "bathrooms", "bathroomCount"])),
    sqft: toInt(first(item, ["area", "livingArea", "sqft", "squareFeet", "sqFt.value"])),
    lot_size: lotSizeSqft(item),
    year_built: toInt(first(item, ["yearBuilt", "yearBuilt.value"])),
    home_type: toStr(first(item, ["homeType", "propertyType", "type"])),
    address_line: toStr(
      first(item, ["address.street", "address.streetAddress", "streetAddress", "addressRaw", "streetLine"]) ??
        (typeof address === "string" ? address : undefined),
    ),
    city: toStr(first(item, ["address.city", "city", "addressCity"])),
    state: toStr(first(item, ["address.state", "state", "addressState"])),
    zip: toStr(first(item, ["address.zipcode", "address.zipCode", "address.zip", "zipcode", "zipCode", "zip", "addressZipcode", "postalCode"])),
    latitude: toNumber(first(item, ["latitude", "lat", "latLong.latitude", "location.latitude"])),
    longitude: toNumber(first(item, ["longitude", "lng", "lon", "latLong.longitude", "location.longitude"])),
    photos: toPhotos(first(item, ["photos", "images", "imgSrc", "image", "photoUrls"])),
    description: toStr(first(item, ["description", "remarks"])),
    broker_name: toStr(first(item, ["brokerName", "broker", "brokerageName", "listingAgent.brokerName"])),
    days_on_market: toInt(first(item, ["daysOnZillow", "daysOnMarket", "dom"])),
    raw: item,
  };
}

// ---------------------------------------------------------------------
// Property detail pages (GET /scrape/{provider}/property)
// Field names below were verified against a real Zillow response.
// ---------------------------------------------------------------------

/** Columns updated from a detail response. Fields absent from the response are left untouched. */
export type PropertyDetailsUpdate = Partial<
  Pick<
    NormalizedProperty,
    | "status"
    | "price"
    | "beds"
    | "baths"
    | "sqft"
    | "year_built"
    | "home_type"
    | "latitude"
    | "longitude"
    | "photos"
    | "description"
    | "broker_name"
    | "days_on_market"
  >
> & {
  mls_id?: string | null;
  agent_name?: string | null;
  agent_phone?: string | null;
  broker_phone?: string | null;
  hoa_fee?: string | null;
  highlights?: string[];
  details: Obj;
  details_fetched_at: string;
};

// Bulky or third-party-keyed fields we never display.
const DROPPED_DETAIL_KEYS = ["suggestedLinks", "staticMapUrls", "breadcrumbs", "nearby"];

const toStrArray = (v: unknown) =>
  Array.isArray(v) ? v.map(toStr).filter((s): s is string => !!s) : [];

export function normalizeDetails(response: unknown): PropertyDetailsUpdate | null {
  const property = isObj(response) && isObj(response.property) ? response.property : null;
  if (!property) return null;

  const details = { ...property };
  for (const key of DROPPED_DETAIL_KEYS) delete details[key];

  const update: PropertyDetailsUpdate = {
    status: toStr(first(property, ["status"])),
    price: toNumber(first(property, ["price"])),
    beds: toNumber(first(property, ["beds", "resoData.bedrooms"])),
    baths: toNumber(first(property, ["baths", "resoData.bathroomsFloat", "resoData.bathrooms"])),
    sqft: toInt(first(property, ["area", "resoData.livingArea"])),
    year_built: toInt(first(property, ["yearBuilt", "resoData.yearBuilt"])),
    home_type: toStr(first(property, ["homeType"])),
    latitude: toNumber(first(property, ["geo.latitude", "latitude"])),
    longitude: toNumber(first(property, ["geo.longitude", "longitude"])),
    photos: toPhotos(first(property, ["photos"])),
    description: toStr(first(property, ["description"])),
    broker_name: toStr(first(property, ["agentInfo.brokerName"])),
    days_on_market: toInt(first(property, ["daysOnZillow"])),
    mls_id: toStr(first(property, ["mlsId"])),
    agent_name: toStr(first(property, ["agentInfo.agentName"])),
    agent_phone: toStr(first(property, ["agentInfo.agentPhoneNumber"])),
    broker_phone: toStr(first(property, ["agentInfo.brokerPhoneNumber"])),
    hoa_fee: toStr(first(property, ["fees.monthlyHoaFee", "resoData.hoaFee"])),
    highlights: toStrArray(first(property, ["highlights"])),
    details,
    details_fetched_at: new Date().toISOString(),
  };

  // Never overwrite good search data with blanks from a sparse detail page.
  for (const [key, value] of Object.entries(update)) {
    if (value === null || (Array.isArray(value) && value.length === 0)) {
      delete update[key as keyof PropertyDetailsUpdate];
    }
  }
  return update;
}
