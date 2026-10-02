import type { DashboardData } from "@/lib/dashboard/types";
import type { MapPoint, PropertyCard } from "@/lib/listing-format";

/** One page of search results plus every matching map pin. */
export type BuyerSearchResult = {
  properties: PropertyCard[];
  points: MapPoint[];
  total: number;
  pageCount: number;
};

/** Per-city market snapshot computed from active listings. */
export type MarketStat = {
  key: string;
  city: string;
  state: string;
  forSale: number;
  forRent: number;
  medianPrice: number | null;
  medianPricePerSqft: number | null;
  medianDaysOnMarket: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  medianRent: number | null;
};

/** Saved homes are DashboardData.homes (the favorites table), keyed by property id. */
export type BuyerData = DashboardData & {
  search: BuyerSearchResult;
  markets: MarketStat[];
};

/**
 * Payment estimate shown on listing rows. The assumptions are displayed next to
 * the number so it is never mistaken for a quote.
 */
export const PAYMENT_ASSUMPTIONS = { downPayment: 0.2, annualRate: 0.0675, years: 30 } as const;

export function estimateMonthlyPayment(price: number | null) {
  if (!price || price <= 0) return null;
  const { downPayment, annualRate, years } = PAYMENT_ASSUMPTIONS;
  const principal = price * (1 - downPayment);
  const r = annualRate / 12;
  const n = years * 12;
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -n)));
}

export function median(values: number[]) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
