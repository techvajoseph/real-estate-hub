import type { DashboardData, WorkspaceRole, Listing, Deal } from "./types";

export function demoDashboard(role: WorkspaceRole = "seller"): DashboardData {
  const now = new Date();
  const ago = (months: number, day = 8) =>
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, day, 12),
    ).toISOString();
  const next = (days: number, hour: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const listings: Listing[] = [
    {
      id: "demo-1",
      title: "The Palm Residence",
      address: "1250 Palm Avenue",
      city: "Beverly Hills, CA",
      kind: "sale",
      price: 2450000,
      beds: 4,
      baths: 3,
      sqft: 3250,
      status: "active",
      photo: "/images/hero-villa.jpg",
      created_at: ago(0),
    },
    {
      id: "demo-2",
      title: "Modern Retreat",
      address: "840 Sunset Drive",
      city: "Los Angeles, CA",
      kind: "sale",
      price: 1850000,
      beds: 3,
      baths: 2,
      sqft: 2480,
      status: "under_offer",
      photo: "/images/modern-home.jpg",
      created_at: ago(1),
    },
    {
      id: "demo-3",
      title: "The Courtyard Loft",
      address: "210 Grand Street, Unit 4",
      city: "Brooklyn, NY",
      kind: "rent",
      price: 4200,
      beds: 2,
      baths: 2,
      sqft: 1450,
      status: "rented",
      photo: "/images/interior.jpg",
      created_at: ago(2),
    },
    {
      id: "demo-4",
      title: "Parkside Apartment",
      address: "48 Park Place",
      city: "New York, NY",
      kind: "rent",
      price: 3600,
      beds: 2,
      baths: 1,
      sqft: 1100,
      status: "active",
      photo: "/images/new-york.jpg",
      created_at: ago(1),
    },
  ];
  const deals: Deal[] = [
    {
      id: "deal-1",
      title: "The Palm Residence",
      contact: "Alex Morgan",
      amount: 2390000,
      stage: "negotiating",
      kind: "sale",
      created_at: ago(0, 1),
      closed_at: null,
    },
    {
      id: "deal-2",
      title: "Modern Retreat",
      contact: "Jamie Chen",
      amount: 1825000,
      stage: "offer",
      kind: "sale",
      created_at: ago(1, 22),
      closed_at: null,
    },
    {
      id: "deal-3",
      title: "Parkside Apartment",
      contact: "Taylor Brooks",
      amount: 3600,
      stage: "viewing",
      kind: "rent",
      created_at: ago(0, 1),
      closed_at: null,
    },
    {
      id: "deal-4",
      title: "Oceanview Villa",
      contact: "Jordan Lee",
      amount: 1650000,
      stage: "closed",
      kind: "sale",
      created_at: ago(2),
      closed_at: ago(0, 1),
    },
    {
      id: "deal-5",
      title: "Hillcrest House",
      contact: "Casey Ellis",
      amount: 1240000,
      stage: "closed",
      kind: "sale",
      created_at: ago(4),
      closed_at: ago(2, 15),
    },
    {
      id: "deal-6",
      title: "Maple Street Home",
      contact: "Sam Rivera",
      amount: 890000,
      stage: "closed",
      kind: "sale",
      created_at: ago(5),
      closed_at: ago(3, 17),
    },
    {
      id: "deal-7",
      title: "The Courtyard Loft",
      contact: "Riley Kim",
      amount: 4200,
      stage: "closed",
      kind: "rent",
      created_at: ago(3),
      closed_at: ago(2, 1),
    },
    {
      id: "deal-8",
      title: "Westside Residence",
      contact: "Avery Davis",
      amount: 975000,
      stage: "lead",
      kind: "sale",
      created_at: ago(0, 1),
      closed_at: null,
    },
  ];
  return {
    asOf: now.toISOString(),
    name: "Alex Morgan",
    email: "alex@example.com",
    role,
    demo: true,
    ready: true,
    listings,
    deals,
    appointments: [
      {
        id: "event-1",
        title: "Private property viewing",
        location: "The Palm Residence",
        starts_at: next(1, 3),
        completed: false,
      },
      {
        id: "event-2",
        title: "Offer review",
        location: "Modern Retreat · Video call",
        starts_at: next(2, 6),
        completed: false,
      },
      {
        id: "event-3",
        title: "Apartment walkthrough",
        location: "Parkside Apartment",
        starts_at: next(3, 2),
        completed: false,
      },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Review the offer for Modern Retreat",
        completed: false,
        created_at: ago(0, 1),
      },
      {
        id: "task-2",
        title: "Prepare documents for the next viewing",
        completed: false,
        created_at: ago(0, 1),
      },
      {
        id: "task-3",
        title: "Update property photography",
        completed: true,
        created_at: ago(0, 1),
      },
    ],
    homes: listings
      .slice(0, 3)
      .map((l) => ({
        id: l.id,
        address: l.title,
        city: l.city,
        price: l.price,
        photo: l.photo,
        beds: l.beds,
        baths: l.baths,
        sqft: l.sqft,
        kind: l.kind,
      })),
    searches: [
      {
        id: "search-1",
        name: "Homes in Los Angeles",
        href: "/properties?q=Los+Angeles&type=for_sale",
      },
      {
        id: "search-2",
        name: "New York rentals",
        href: "/properties?q=New+York&type=for_rent",
      },
    ],
  };
}
