import type { DashboardData, Listing } from "@/lib/dashboard/types";
export type Rental = Listing & {
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  lease_start?: string | null;
  lease_end?: string | null;
  notes?: string;
  source_property_id?: string | null;
};
export type RentalTransaction = {
  id: string;
  property_id: string;
  kind: "rent" | "expense";
  description: string;
  amount: number;
  status: "paid" | "pending";
  occurred_on: string;
};
/** A for-rent listing from the public marketplace that a landlord can import. */
export type MarketRental = {
  id: string;
  address: string;
  city: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  photo: string;
};
export type LandlordData = Omit<DashboardData, "listings"> & {
  listings: Rental[];
  marketRentals: MarketRental[];
  transactions: RentalTransaction[];
  rentalReady: boolean;
  suggestedRental: Rental | null;
};
export function rentalSummary(
  properties: Rental[],
  transactions: RentalTransaction[],
  asOf: string,
) {
  const today = asOf.slice(0, 10);
  const month = today.slice(0, 7);
  const eligible = properties.filter(
    (p) =>
      p.kind === "rent" && (p.status === "active" || p.status === "rented"),
  );
  const occupied = eligible.filter((p) => p.status === "rented");
  const current = transactions.filter(
    (t) =>
      t.occurred_on.startsWith(month) &&
      t.occurred_on <= today &&
      t.status === "paid",
  );
  const income = current
    .filter((t) => t.kind === "rent")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = current
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return {
    properties: properties.length,
    occupied: occupied.length,
    occupancy: eligible.length
      ? Math.round((occupied.length / eligible.length) * 100)
      : 0,
    scheduled: occupied.reduce((sum, p) => sum + p.price, 0),
    income,
    expenses,
    net: income - expenses,
    overdue: transactions.filter(
      (t) =>
        t.kind === "rent" && t.status === "pending" && t.occurred_on < today,
    ),
    expiring: properties.filter(
      (p) =>
        p.lease_end &&
        p.lease_end >= today &&
        new Date(p.lease_end).getTime() - new Date(today).getTime() <=
          30 * 86400000,
    ),
  };
}
export function rentalHistory(
  transactions: RentalTransaction[],
  asOf: string,
  count: number,
) {
  const date = new Date(asOf);
  return Array.from({ length: count }, (_, index) => {
    const monthDate = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() - count + index + 1,
        1,
      ),
    );
    const key = monthDate.toISOString().slice(0, 7);
    const rows = transactions.filter(
      (t) =>
        t.status === "paid" &&
        t.occurred_on.startsWith(key) &&
        t.occurred_on <= asOf.slice(0, 10),
    );
    return {
      key,
      label: monthDate.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      income: rows
        .filter((t) => t.kind === "rent")
        .reduce((sum, t) => sum + t.amount, 0),
      expenses: rows
        .filter((t) => t.kind === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    };
  });
}
