import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";
import type { DashboardData, SavedHome, WorkspaceRole } from "./types";
import { photoUrl } from "@/lib/photos";

export async function getDashboardData(
  user: CurrentUser,
): Promise<DashboardData> {
  const db = await createClient();
  const [workspace, listings, deals, appointments, tasks, favorites, searches] =
    await Promise.all([
      db.from("workspaces").select("role").eq("user_id", user.id).maybeSingle(),
      db
        .from("portfolio_listings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      db
        .from("workspace_deals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      db
        .from("workspace_appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("starts_at"),
      db
        .from("workspace_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      db
        .from("favorites")
        .select(
          "property:properties(id,address_line,city,state,price,photos,beds,baths,sqft,listing_type)",
        )
        .eq("user_id", user.id),
      db
        .from("saved_searches")
        .select("id,name,filters")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
  const ready = ![
    workspace,
    listings,
    deals,
    appointments,
    tasks,
    favorites,
    searches,
  ].some((result) => result.error);
  const homes: SavedHome[] = (favorites.data ?? []).flatMap((row) => {
    const value = row.property as unknown as {
      id: string;
      address_line: string;
      city: string;
      state: string;
      price: number;
      photos: string[];
      beds: number;
      baths: number;
      sqft: number;
      listing_type: string;
    } | null;
    return value
      ? [
          {
            id: value.id,
            address: value.address_line || "Saved home",
            city: [value.city, value.state].filter(Boolean).join(", "),
            price: value.price,
            photo: value.photos[0] ? photoUrl(value.photos[0], "card") : "",
            beds: value.beds,
            baths: value.baths,
            sqft: value.sqft,
            kind:
              value.listing_type === "for_rent"
                ? ("rent" as const)
                : ("sale" as const),
          },
        ]
      : [];
  });
  return {
    asOf: new Date().toISOString(),
    name: user.fullName || "Your workspace",
    email: user.email,
    role: (workspace.data?.role ||
      (user.role === "member" ? "buyer" : "seller")) as WorkspaceRole,
    demo: false,
    ready,
    listings: listings.data ?? [],
    deals: deals.data ?? [],
    appointments: appointments.data ?? [],
    tasks: tasks.data ?? [],
    homes,
    searches: (searches.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      href:
        "/properties?" +
        new URLSearchParams(
          Object.entries(s.filters as Record<string, unknown>).flatMap(
            ([key, value]) => (value == null ? [] : [[key, String(value)]]),
          ),
        ).toString(),
    })),
  };
}
