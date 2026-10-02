import type { PropertyFilters } from "./properties";

/*
 * Browser-safe listing helpers and types (no server imports), shared by
 * server pages and client components such as the map and filter bar.
 */

/**
 * Providers label home types inconsistently ("SINGLE_FAMILY" vs "Single Family
 * Residential", "LOT" vs "Vacant Land"), so filtering and display go through
 * these normalized categories. `patterns` are case-insensitive ILIKE fragments.
 */
export const HOME_CATEGORIES = {
  house: { label: "Houses", single: "House", patterns: ["%single%family%"] },
  townhouse: { label: "Townhomes", single: "Townhouse", patterns: ["%town%"] },
  condo: { label: "Condos / co-ops", single: "Condo", patterns: ["%condo%", "%co-op%", "%apartment%"] },
  multi: { label: "Multi-family", single: "Multi-family home", patterns: ["%multi%"] },
  land: { label: "Lots / land", single: "Lot", patterns: ["lot", "%land%"] },
  manufactured: { label: "Manufactured", single: "Manufactured home", patterns: ["%manufactured%", "%mobile%"] },
} as const;

export type HomeCategory = keyof typeof HOME_CATEGORIES;
export const HOME_CATEGORY_KEYS = Object.keys(HOME_CATEGORIES) as [HomeCategory, ...HomeCategory[]];

export const SORT_OPTIONS = {
  newest: "Newest",
  price_desc: "Price (high to low)",
  price_asc: "Price (low to high)",
  beds_desc: "Bedrooms",
  baths_desc: "Bathrooms",
  sqft_desc: "Square feet",
} as const;

export type PropertyCard = {
  id: string;
  provider: "zillow" | "redfin";
  listing_type: "for_sale" | "for_rent" | "sold";
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  home_type: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  broker_name: string | null;
  days_on_market: number | null;
};

export type MapPoint = Pick<
  PropertyCard,
  "id" | "price" | "listing_type" | "beds" | "baths" | "sqft" | "home_type" | "address_line" | "city" | "state" | "zip"
> & { latitude: number; longitude: number };

/** Serializes filters back to a query string (drops defaults and empties). */
export function filtersToQuery(filters: Partial<PropertyFilters>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "page" && value === 1) continue;
    if (Array.isArray(value)) {
      if (value.length) qs.set(key, value.join(","));
    } else qs.set(key, String(value));
  }
  return qs.toString();
}

export function homeCategory(homeType: string | null): HomeCategory | null {
  if (!homeType) return null;
  const value = homeType.toLowerCase();
  for (const key of HOME_CATEGORY_KEYS) {
    const matches = HOME_CATEGORIES[key].patterns.some((p) => {
      const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&").replaceAll("%", ".*")}$`);
      return re.test(value);
    });
    if (matches) return key;
  }
  return null;
}

/** "House for sale", "Lot for sale", "Condo for rent" … */
export function listingLabel(p: Pick<PropertyCard, "home_type" | "listing_type">) {
  const category = homeCategory(p.home_type);
  const noun = category ? HOME_CATEGORIES[category].single : "Home";
  const status = p.listing_type === "for_rent" ? "for rent" : p.listing_type === "sold" ? "sold" : "for sale";
  return `${noun} ${status}`;
}

/** Unaddressed parcels ("Nka Hwy 20", "TBD Main St") have only approximate pins. */
export function isApproximateLocation(addressLine: string | null) {
  return !addressLine || /^(nka|nkn|unk|tbd|xx|lot\b|0\s)/i.test(addressLine.trim());
}

export function formatPrice(price: number | null, listingType?: string) {
  if (price === null) return "Price on request";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
  return listingType === "for_rent" ? `${formatted}/mo` : formatted;
}

/** Compact map-pin label: $639K, $1.25M, $2.4K/mo. */
export function formatPriceShort(price: number | null, listingType?: string) {
  if (price === null) return "—";
  const short =
    price >= 1_000_000
      ? `$${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "")}M`
      : price >= 1_000
        ? `$${Math.round(price / 1_000)}K`
        : `$${price}`;
  return listingType === "for_rent" ? `${short}/mo` : short;
}

export function formatAddress(p: {
  address_line: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}) {
  const locality = [p.city, [p.state, p.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [p.address_line, locality].filter(Boolean).join(", ") || "Address unavailable";
}
