import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard/data";
import { demoDashboard } from "@/lib/dashboard/demo";
import type { DashboardData, SavedHome } from "@/lib/dashboard/types";
import { photoUrl } from "@/lib/photos";
import {
  parseFilters,
  searchMapPoints,
  searchProperties,
  type PropertyFilters,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";
import { median, type BuyerData, type BuyerSearchResult, type MarketStat } from "./types";

/** Buyers land on homes for sale unless they choose otherwise. */
export const DEFAULT_BUYER_FILTERS: PropertyFilters = parseFilters({ type: "for_sale" });

export async function runBuyerSearch(filters: PropertyFilters): Promise<BuyerSearchResult> {
  const [{ properties, total, pageCount }, points] = await Promise.all([
    searchProperties(filters),
    searchMapPoints(filters),
  ]);
  return { properties, points, total, pageCount };
}

/** City-level snapshot of the active marketplace (real listing data, no estimates). */
export async function getMarketStats(): Promise<MarketStat[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("properties")
    .select("city, state, listing_type, price, sqft, days_on_market")
    .eq("is_active", true)
    .not("city", "is", null)
    .limit(5000);
  if (error || !data) return [];

  const groups = new Map<string, typeof data>();
  for (const row of data) {
    const key = `${row.city}|${row.state ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()]
    .map(([key, rows]) => {
      const sale = rows.filter((r) => r.listing_type === "for_sale");
      const rent = rows.filter((r) => r.listing_type === "for_rent");
      const salePrices = sale.map((r) => Number(r.price)).filter((p) => p > 0);
      return {
        key,
        city: rows[0].city as string,
        state: rows[0].state ?? "",
        forSale: sale.length,
        forRent: rent.length,
        medianPrice: median(salePrices),
        medianPricePerSqft: median(
          sale.filter((r) => Number(r.price) > 0 && Number(r.sqft) > 0).map((r) => Number(r.price) / Number(r.sqft)),
        ),
        medianDaysOnMarket: median(sale.map((r) => r.days_on_market).filter((d): d is number => d !== null)),
        minPrice: salePrices.length ? Math.min(...salePrices) : null,
        maxPrice: salePrices.length ? Math.max(...salePrices) : null,
        medianRent: median(rent.map((r) => Number(r.price)).filter((p) => p > 0)),
      };
    })
    .sort((a, b) => b.forSale + b.forRent - (a.forSale + a.forRent));
}

/** `base` lets the dashboard page reuse the workspace data it already loaded. */
export async function getBuyerData(user: CurrentUser, base?: DashboardData): Promise<BuyerData> {
  const [loaded, search, markets] = await Promise.all([
    base ?? getDashboardData(user),
    runBuyerSearch(DEFAULT_BUYER_FILTERS),
    getMarketStats(),
  ]);
  return {
    ...loaded,
    role: "buyer",
    search,
    markets,
  };
}

/** Public preview: real marketplace listings and markets, sample personal records. */
export async function buyerPreview(): Promise<BuyerData> {
  const [search, markets] = await Promise.all([runBuyerSearch(DEFAULT_BUYER_FILTERS), getMarketStats()]);
  const base = demoDashboard("buyer");
  const homes: SavedHome[] = search.properties.slice(0, 3).map((p) => ({
    id: p.id,
    address: p.address_line || "Saved home",
    city: [p.city, p.state].filter(Boolean).join(", "),
    price: p.price,
    photo: p.photos[0] ? photoUrl(p.photos[0], "card") : "",
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    kind: p.listing_type === "for_rent" ? "rent" : "sale",
  }));
  return {
    ...base,
    role: "buyer",
    homes,
    searches: [
      { id: "demo-search-1", name: "Austin, 3+ beds", href: "/properties?q=Austin&minBeds=3&type=for_sale" },
      { id: "demo-search-2", name: "Houses under $500K", href: "/properties?maxPrice=500000&homeTypes=house&type=for_sale" },
    ],
    search,
    markets,
  };
}
