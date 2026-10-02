import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/photo-gallery";
import { refreshPropertyDetails } from "@/app/admin/import/actions";
import { getCurrentUser } from "@/lib/auth";
import { formatAddress, formatPrice, getProperty } from "@/lib/properties";
import { readDetails } from "@/lib/property-details";
import { safeHttpUrl } from "@/lib/safe-url";
import { createClient } from "@/lib/supabase/server";
import { toggleFavorite } from "../actions";

// The admin "refresh details" action calls HasData from this page.
export const maxDuration = 60;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const HOME_TYPES: Record<string, string> = {
  SINGLE_FAMILY: "Single family",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  MULTI_FAMILY: "Multi-family",
  APARTMENT: "Apartment",
  LOT: "Lot / land",
  MANUFACTURED: "Manufactured",
};

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  const property = await getProperty((await params).id);
  return { title: property ? formatAddress(property) : "Property not found" };
}

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const [property, user] = await Promise.all([getProperty(id), getCurrentUser()]);
  if (!property) notFound();

  let isFavorite = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id)
      .eq("property_id", id)
      .maybeSingle();
    isFavorite = !!data;
  }

  const details = readDetails(property.details);
  const address = formatAddress(property);
  const listingUrl = safeHttpUrl(property.url);
  const hasCoords = property.latitude !== null && property.longitude !== null;

  const keyFacts: [string, string | null][] = [
    ["Type", property.home_type ? (HOME_TYPES[property.home_type] ?? property.home_type) : null],
    ["Year built", property.year_built?.toString() ?? null],
    ["Lot", property.lot_size ? `${Math.round(property.lot_size).toLocaleString()} sqft` : null],
    ["Price/sqft", property.price && property.sqft ? usd.format(property.price / property.sqft) : null],
    ["HOA", property.hoa_fee],
    ["Days listed", property.days_on_market?.toString() ?? null],
    ["MLS #", property.mls_id],
  ];

  return (
    <article className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <Link href="/properties" className="text-sm text-muted-foreground hover:text-foreground">← Back to results</Link>

      <PhotoGallery photos={property.photos} alt={address} />

      {/* Headline */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-3xl font-semibold">{formatPrice(property.price, property.listing_type)}</p>
          <p className="text-lg">
            {[
              property.beds !== null && `${property.beds} bd`,
              property.baths !== null && `${property.baths} ba`,
              property.sqft !== null && `${property.sqft.toLocaleString()} sqft`,
            ].filter(Boolean).join(" · ")}
          </p>
          <p className="text-muted-foreground">{address}</p>
        </div>
        <div id="save-home" className="flex gap-2">
          {user ? (
            <form action={toggleFavorite}>
              <input type="hidden" name="propertyId" value={property.id} />
              <button className={isFavorite ? "btn" : "btn-outline"}>{isFavorite ? "★ Saved" : "☆ Save"}</button>
            </form>
          ) : (
            <Link href={`/login?next=/properties/${property.id}`} className="btn-outline">Sign in to save</Link>
          )}
          {user?.role === "admin" && (
            <form action={refreshPropertyDetails}>
              <input type="hidden" name="propertyId" value={property.id} />
              <button className="btn-outline" title="Fetch full details from HasData (10 credits)">
                {property.details_fetched_at ? "↻ Refresh details" : "Fetch full details"}
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Key facts */}
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
            {keyFacts.filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {property.highlights.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {property.highlights.map((h: string) => (
                <li key={h} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{h}</li>
              ))}
            </ul>
          )}

          {property.description && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">About this home</h2>
              <p className="whitespace-pre-line leading-relaxed">{property.description}</p>
              {details.virtualTour && (
                <a href={details.virtualTour} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                  Virtual tour ↗
                </a>
              )}
            </section>
          )}

          {details.featureGroups.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Facts & features</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {details.featureGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 font-medium">{group.title}</h3>
                    <dl className="space-y-1 text-sm">
                      {group.items.map((item) => (
                        <div key={item.label} className="flex gap-2">
                          <dt className="w-40 shrink-0 text-muted-foreground">{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          {details.priceHistory.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Price history</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2">Date</th><th>Event</th><th className="text-right">Price</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {details.priceHistory.slice(0, 12).map((e, i) => (
                    <tr key={`${e.date}-${i}`}>
                      <td className="py-2">{e.date}</td>
                      <td>{e.event}</td>
                      <td className="text-right">{e.price !== null ? usd.format(e.price) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {details.taxHistory.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Tax history</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2">Year</th><th className="text-right">Property tax</th><th className="text-right">Assessed value</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {details.taxHistory.slice(0, 8).map((t) => (
                    <tr key={t.year}>
                      <td className="py-2">{t.year}</td>
                      <td className="text-right">{t.taxPaid !== null ? usd.format(t.taxPaid) : "—"}</td>
                      <td className="text-right">{t.assessedValue !== null ? usd.format(t.assessedValue) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {details.schools.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Nearby schools</h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {details.schools.map((s) => (
                  <li key={s.name} className="flex items-center gap-4 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {s.rating ?? "–"}
                    </span>
                    <div className="flex-1">
                      {s.link ? (
                        <a href={s.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">{s.name}</a>
                      ) : (
                        <p className="font-medium">{s.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[s.grades && `Grades ${s.grades}`, s.distance !== null && `${s.distance} mi`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Ratings out of 10 from GreatSchools.</p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {(property.agent_name || property.broker_name) && (
            <section className="space-y-2 rounded-lg border border-border bg-card p-4">
              <h2 className="font-semibold">Listed by</h2>
              {property.agent_name && (
                <p>
                  {property.agent_name}
                  {property.agent_phone && (
                    <> · <a href={`tel:${property.agent_phone}`} className="text-primary">{property.agent_phone}</a></>
                  )}
                </p>
              )}
              {property.broker_name && (
                <p className="text-sm text-muted-foreground">
                  {property.broker_name}
                  {property.broker_phone && property.broker_phone !== property.agent_phone && ` · ${property.broker_phone}`}
                </p>
              )}
              {details.listingSource && <p className="text-xs text-muted-foreground">{details.listingSource}</p>}
            </section>
          )}

          {details.mortgage.length > 0 && (
            <section className="space-y-2 rounded-lg border border-border bg-card p-4">
              <h2 className="font-semibold">Estimated payment</h2>
              <ul className="space-y-1 text-sm">
                {details.mortgage.slice(0, 3).map((m) => (
                  <li key={m.program} className="flex justify-between">
                    <span className="text-muted-foreground">{m.program}{m.rate !== null && ` @ ${m.rate}%`}</span>
                    <span className="font-medium">{m.monthlyPayment !== null ? `${usd.format(m.monthlyPayment)}/mo` : "—"}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">20% down. Estimates only.</p>
            </section>
          )}

          {hasCoords && (
            <section className="space-y-2">
              <iframe
                title="Map"
                className="aspect-square w-full rounded-lg border border-border"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01},${property.latitude - 0.007},${property.longitude + 0.01},${property.latitude + 0.007}&layer=mapnik&marker=${property.latitude},${property.longitude}`}
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary"
              >
                Open in Google Maps ↗
              </a>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            Source: {property.provider}
            {listingUrl && (
              <> · <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="underline">original listing</a></>
            )}
            <br />
            Updated {new Date(property.updated_at).toLocaleDateString()}
            {!property.details_fetched_at && " · summary only"}
          </p>
        </aside>
      </div>
    </article>
  );
}
