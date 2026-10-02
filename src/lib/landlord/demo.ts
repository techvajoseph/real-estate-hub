import { demoDashboard } from "@/lib/dashboard/demo";
import type { LandlordData, MarketRental, Rental, RentalTransaction } from "./types";
export function landlordPreview(source: Rental | null, marketRentals: MarketRental[] = []): LandlordData {
  const base = demoDashboard("landlord");
  const today = base.asOf.slice(0, 10);
  const now = new Date(base.asOf);
  const monthDate = (back: number, day = 1) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, day))
      .toISOString()
      .slice(0, 10);
  const rentals: Rental[] = [
    ...(source
      ? [
          {
            ...source,
            id: "preview-featured",
            status: "rented" as const,
            tenant_name: "Jamie Chen",
            tenant_email: "jamie@example.com",
            tenant_phone: "",
            lease_start: monthDate(6),
            lease_end: monthDate(-1),
            notes:
              "Sample tenancy for exploring the preview. This is not the actual listing’s tenant.",
          },
        ]
      : []),
    ...base.listings
      .filter((p) => p.kind === "rent")
      .map((p, i) => ({
        ...p,
        tenant_name: i === 0 ? "Taylor Brooks" : "",
        tenant_email: i === 0 ? "taylor@example.com" : "",
        lease_start: i === 0 ? monthDate(4) : null,
        lease_end: i === 0 ? monthDate(-3) : null,
      })),
  ];
  const transactions: RentalTransaction[] = [];
  for (let i = 5; i >= 0; i--) {
    for (const property of rentals.filter((p) => p.status === "rented")) {
      transactions.push({
        id: "sample-rent-" + property.id + "-" + i,
        property_id: property.id,
        kind: "rent",
        description: "Monthly rent",
        amount: property.price,
        status: "paid",
        occurred_on: monthDate(i),
      });
    }
    if (rentals[0])
      transactions.push({
        id: "sample-expense-" + i,
        property_id: rentals[0].id,
        kind: "expense",
        description: i % 2 ? "Property upkeep" : "Routine maintenance",
        amount: [180, 320, 750, 280, 460, 240][i],
        status: "paid",
        occurred_on: monthDate(i),
      });
  }
  if (rentals[1])
    transactions.push({
      id: "sample-pending",
      property_id: rentals[1].id,
      kind: "rent",
      description: "Outstanding rent balance",
      amount: 450,
      status: "pending",
      occurred_on: monthDate(1, 28),
    });
  return {
    ...base,
    name: "Alex Morgan",
    listings: rentals,
    marketRentals,
    transactions,
    suggestedRental: source,
    rentalReady: true,
    tasks: [
      {
        id: "landlord-task-1",
        title: "Arrange the annual property inspection",
        completed: false,
        created_at: today,
      },
      {
        id: "landlord-task-2",
        title: "Review the upcoming lease renewal",
        completed: false,
        created_at: today,
      },
    ],
  };
}
