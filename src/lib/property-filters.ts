import { z } from "zod";
import { HOME_CATEGORY_KEYS, SORT_OPTIONS } from "./listing-format";

/*
 * Search filter schema, shared by server queries and client components
 * (dashboard search, filter bars). Browser-safe: no server imports.
 */

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);

const coordinate = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.number().min(min).max(max).optional());

export const propertyFiltersSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  type: z.enum(["for_sale", "for_rent", "sold"]).optional().catch(undefined),
  provider: z.enum(["zillow", "redfin"]).optional().catch(undefined),
  minPrice: optionalNumber.catch(undefined),
  maxPrice: optionalNumber.catch(undefined),
  minBeds: optionalNumber.catch(undefined),
  minBaths: optionalNumber.catch(undefined),
  minSqft: optionalNumber.catch(undefined),
  maxSqft: optionalNumber.catch(undefined),
  /** Comma-separated in the URL: ?homeTypes=house,condo */
  homeTypes: z
    .preprocess(
      (v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v),
      z.array(z.enum(HOME_CATEGORY_KEYS)).optional(),
    )
    .catch(undefined),
  /** Map viewport ("search as I move the map"). */
  north: coordinate(-90, 90).catch(undefined),
  south: coordinate(-90, 90).catch(undefined),
  east: coordinate(-180, 180).catch(undefined),
  west: coordinate(-180, 180).catch(undefined),
  sort: z
    .enum(Object.keys(SORT_OPTIONS) as [keyof typeof SORT_OPTIONS, ...(keyof typeof SORT_OPTIONS)[]])
    .default("newest")
    .catch("newest"),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): PropertyFilters {
  const flat = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return propertyFiltersSchema.parse(flat);
}

