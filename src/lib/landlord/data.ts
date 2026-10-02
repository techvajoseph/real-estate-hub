import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/data";
import type { CurrentUser } from "@/lib/auth";
import { photoUrl } from "@/lib/photos";
import type { LandlordData, MarketRental, Rental } from "./types";

// Randomly selected from the live for-rent catalog for this design.
export const FEATURED_RENTAL_ID = "97637189-177d-4502-9648-e7a66ff241bb";
export async function rentalFromMarketplace(
  id = FEATURED_RENTAL_ID,
): Promise<Rental | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("properties")
    .select(
      "id,address_line,city,state,price,beds,baths,sqft,photos,first_seen_at",
    )
    .eq("id", id)
    .eq("listing_type", "for_rent")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: "source-" + data.id,
    title: data.address_line || "Rental property",
    address: data.address_line || "Address unavailable",
    city: [data.city, data.state].filter(Boolean).join(", "),
    kind: "rent",
    price: Number(data.price ?? 0),
    beds: data.beds ?? 0,
    baths: data.baths ?? 0,
    sqft: data.sqft ?? 0,
    status: "draft",
    photo: data.photos[0] ? photoUrl(data.photos[0], "large") : "",
    created_at: data.first_seen_at,
    source_property_id: data.id,
  };
}
/** Newest active for-rent listings from the marketplace, for the "Rental listings" view. */
export async function getMarketRentals(limit = 24): Promise<MarketRental[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("properties")
    .select("id,address_line,city,state,zip,price,beds,baths,sqft,photos")
    .eq("listing_type", "for_rent")
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    address: p.address_line || "Address unavailable",
    city: [p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    price: p.price === null ? null : Number(p.price),
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    photo: p.photos?.[0] ? photoUrl(p.photos[0], "card") : "",
  }));
}
export async function getLandlordData(
  user: CurrentUser,
): Promise<LandlordData> {
  const db = await createClient();
  const [base, ledger, suggestedRental, columns, marketRentals] = await Promise.all([
    getDashboardData(user),
    db
      .from("rental_transactions")
      .select("id,property_id,kind,description,amount,status,occurred_on")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false }),
    rentalFromMarketplace(),
    db
      .from("portfolio_listings")
      .select("tenant_name")
      .eq("user_id", user.id)
      .limit(0),
    getMarketRentals(),
  ]);
  return {
    ...base,
    listings: base.listings.filter((p) => p.kind === "rent"),
    transactions: ledger.data ?? [],
    rentalReady: !ledger.error && !columns.error,
    suggestedRental,
    marketRentals,
  };
}
