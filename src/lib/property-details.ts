/**
 * Typed, defensive reader over `properties.details` (the stored HasData
 * property response). Every section returns empty values when absent, so the
 * page renders the same way for enriched and search-only listings.
 */

import { safeHttpUrl } from "./safe-url";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : []);

export interface FeatureGroup {
  title: string;
  items: { label: string; value: string }[];
}

export interface PriceEvent {
  date: string;
  event: string;
  price: number | null;
  source: string | null;
}

export interface TaxRecord {
  year: number;
  taxPaid: number | null;
  assessedValue: number | null;
}

export interface School {
  name: string;
  rating: number | null;
  grades: string | null;
  distance: number | null;
  link: string | null;
}

export interface MortgageEstimate {
  program: string;
  rate: number | null;
  monthlyPayment: number | null;
}

// Label → resoData key. Grouped the way buyers scan a listing.
const FEATURE_GROUPS: { title: string; fields: [string, string][] }[] = [
  {
    title: "Interior",
    fields: [
      ["Bedrooms", "bedrooms"],
      ["Full baths", "bathroomsFull"],
      ["Half baths", "bathroomsHalf"],
      ["Main-level bedrooms", "mainLevelBedrooms"],
      ["Flooring", "flooring"],
      ["Appliances", "appliances"],
      ["Interior features", "interiorFeatures"],
      ["Fireplace", "fireplaceFeatures"],
      ["Heating", "heating"],
      ["Cooling", "cooling"],
      ["Windows", "windowFeatures"],
      ["Accessibility", "accessibilityFeatures"],
      ["Furnished", "furnished"],
    ],
  },
  {
    title: "Property",
    fields: [
      ["Stories", "stories"],
      ["Levels", "levels"],
      ["Property subtype", "propertySubType"],
      ["Condition", "propertyCondition"],
      ["New construction", "isNewConstruction"],
      ["Roof", "roofType"],
      ["Foundation", "foundationDetails"],
      ["Construction", "constructionMaterials"],
      ["Exterior features", "exteriorFeatures"],
      ["Patio & porch", "patioAndPorchFeatures"],
      ["Pool", "poolFeatures"],
      ["Spa", "spaFeatures"],
      ["Fencing", "fencing"],
      ["View", "view"],
      ["Waterfront", "waterfrontFeatures"],
      ["Other structures", "otherStructures"],
    ],
  },
  {
    title: "Parking & lot",
    fields: [
      ["Garage spaces", "garageParkingCapacity"],
      ["Total parking", "parkingCapacity"],
      ["Parking features", "parkingFeatures"],
      ["Lot size", "lotSize"],
      ["Lot features", "lotFeatures"],
    ],
  },
  {
    title: "Utilities & community",
    fields: [
      ["Sewer", "sewer"],
      ["Water", "waterSource"],
      ["Utilities", "utilities"],
      ["Subdivision", "subdivisionName"],
      ["Community features", "communityFeatures"],
      ["HOA", "hoaFee"],
      ["HOA includes", "associationFeeIncludes"],
      ["Association", "associationName"],
    ],
  },
  {
    title: "Financial",
    fields: [
      ["Price per sqft", "pricePerSquareFoot"],
      ["Annual tax", "taxAnnualAmount"],
      ["Tax assessed value", "taxAssessedValue"],
      ["Listing terms", "listingTerms"],
      ["Special conditions", "specialListingConditions"],
      ["Parcel number", "parcelNumber"],
    ],
  },
];

function displayValue(v: unknown): string | null {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    const items = strList(v).filter((s) => s.toLowerCase() !== "none");
    return items.length ? items.join(", ") : null;
  }
  return str(v);
}

export function readDetails(details: unknown) {
  const d = isObj(details) ? details : {};
  const reso = isObj(d.resoData) ? d.resoData : {};

  const featureGroups: FeatureGroup[] = FEATURE_GROUPS.map((g) => ({
    title: g.title,
    items: g.fields.flatMap(([label, key]) => {
      const value = displayValue(reso[key]);
      return value ? [{ label, value }] : [];
    }),
  })).filter((g) => g.items.length > 0);

  const priceHistory: PriceEvent[] = (Array.isArray(d.priceHistory) ? d.priceHistory : [])
    .filter(isObj)
    .map((e) => ({
      date: str(e.date) ?? "",
      event: humanizeEvent(str(e.event) ?? ""),
      price: num(e.price),
      source: str(e.source),
    }))
    .filter((e) => e.date);

  const taxHistory: TaxRecord[] = (Array.isArray(d.taxHistory) ? d.taxHistory : [])
    .filter(isObj)
    .flatMap((t) => {
      const time = num(t.time);
      return time
        ? [{ year: new Date(time).getFullYear(), taxPaid: num(t.taxPaid), assessedValue: num(t.value) }]
        : [];
    });

  const schoolsObj = isObj(d.schools) ? d.schools : {};
  const schools: School[] = (Array.isArray(schoolsObj.nearbySchools) ? schoolsObj.nearbySchools : [])
    .filter(isObj)
    .flatMap((s) => {
      const name = str(s.name);
      return name
        ? [{ name, rating: num(s.rating), grades: str(s.grades), distance: num(s.distance), link: safeHttpUrl(s.link) }]
        : [];
    });

  const mortgage: MortgageEstimate[] = (Array.isArray(d.mortgage) ? d.mortgage : [])
    .filter(isObj)
    .flatMap((m) => {
      const program = str(m.loanProgram);
      return program
        ? [{ program, rate: num(m.interestRate), monthlyPayment: num(m.estimatedMonthlyPayment) }]
        : [];
    });

  const agent = isObj(d.agentInfo) ? d.agentInfo : {};

  return {
    featureGroups,
    priceHistory,
    taxHistory,
    schools,
    mortgage,
    listingSource: str(agent.source),
    listingType: str(d.listingType),
    datePosted: str(d.datePosted),
    views: num(d.views),
    saves: num(d.saves),
    virtualTour: safeHttpUrl(reso.virtualTour),
  };
}

const EVENT_LABELS: Record<string, string> = {
  listedForSale: "Listed for sale",
  listedForRent: "Listed for rent",
  listingRemoved: "Listing removed",
  priceChange: "Price change",
  sold: "Sold",
  pendingSale: "Pending sale",
  contingent: "Contingent",
};

function humanizeEvent(event: string) {
  return EVENT_LABELS[event] ?? event.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}
