export type WorkspaceRole = "buyer" | "seller" | "landlord";
export type ListingStatus =
  "draft" | "active" | "under_offer" | "sold" | "rented" | "archived";
export type DealStage =
  "lead" | "viewing" | "offer" | "negotiating" | "closed" | "lost";
export type Listing = {
  id: string;
  title: string;
  address: string;
  city: string;
  kind: "sale" | "rent";
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: ListingStatus;
  photo: string;
  created_at: string;
};
export type Deal = {
  id: string;
  title: string;
  contact: string;
  amount: number;
  stage: DealStage;
  kind: "sale" | "rent";
  created_at: string;
  closed_at: string | null;
};
export type Appointment = {
  id: string;
  title: string;
  location: string;
  starts_at: string;
  completed: boolean;
};
export type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};
export type SavedHome = {
  id: string;
  address: string;
  city: string;
  price: number | null;
  photo: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  kind: "sale" | "rent";
};
export type SavedSearch = { id: string; name: string; href: string };
export type DashboardData = {
  asOf: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  demo: boolean;
  ready: boolean;
  listings: Listing[];
  deals: Deal[];
  appointments: Appointment[];
  tasks: Task[];
  homes: SavedHome[];
  searches: SavedSearch[];
};
export const stageLabels: Record<DealStage, string> = {
  lead: "New lead",
  viewing: "Viewing",
  offer: "Offer made",
  negotiating: "Negotiating",
  closed: "Closed",
  lost: "Lost",
};
export const statusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  sold: "Sold",
  rented: "Rented",
  archived: "Archived",
};
export function money(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
}
export function summarize(data: DashboardData) {
  const active = data.listings.filter(
    (l) => l.status === "active" || l.status === "under_offer",
  );
  const open = data.deals.filter(
    (d) => d.stage !== "closed" && d.stage !== "lost",
  );
  const closed = data.deals.filter(
    (d) => d.stage === "closed" && d.kind === "sale",
  );
  const rentals = data.listings.filter(
    (l) => l.kind === "rent" && l.status !== "archived" && l.status !== "draft",
  );
  return {
    active: active.length,
    pipeline: open
      .filter((d) => d.kind === "sale")
      .reduce((sum, d) => sum + d.amount, 0),
    openDeals: open.length,
    sales: closed.reduce((sum, d) => sum + d.amount, 0),
    closed: closed.length,
    monthlyRent: rentals
      .filter((l) => l.status === "rented")
      .reduce((sum, l) => sum + l.price, 0),
    occupancy: rentals.length
      ? Math.round(
          (rentals.filter((l) => l.status === "rented").length /
            rentals.length) *
            100,
        )
      : 0,
    rentalCount: rentals.length,
  };
}
export function monthlyActivity(
  deals: Deal[],
  months: number,
  now = new Date(),
) {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + i + 1, 1),
    );
    const inMonth = (value: string) => {
      const d = new Date(value);
      return (
        d.getUTCFullYear() === date.getUTCFullYear() &&
        d.getUTCMonth() === date.getUTCMonth()
      );
    };
    return {
      label: date.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      opened: deals.filter((d) => inMonth(d.created_at)).length,
      closed: deals.filter(
        (d) => d.stage === "closed" && d.closed_at && inMonth(d.closed_at),
      ).length,
    };
  });
}
