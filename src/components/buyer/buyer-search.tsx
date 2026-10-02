"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Bath, BedDouble, ChevronLeft, ChevronRight, Heart, House, Maximize, SearchX } from "lucide-react";
import { PropertyImage } from "@/components/property-image";
import { ListingsMap, type Bounds } from "@/components/search/listings-map";
import { photoUrl } from "@/lib/photos";
import {
  formatAddress,
  formatPrice,
  homeCategory,
  HOME_CATEGORIES,
  isApproximateLocation,
  SORT_OPTIONS,
  type PropertyCard,
} from "@/lib/listing-format";
import type { PropertyFilters } from "@/lib/properties";
import { estimateMonthlyPayment, PAYMENT_ASSUMPTIONS, type BuyerSearchResult } from "@/lib/buyer/types";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

type Props = {
  filters: PropertyFilters;
  result: BuyerSearchResult;
  pending: boolean;
  savedIds: Set<string>;
  onToggleSave: (property: PropertyCard) => void;
  onFilters: (patch: Partial<PropertyFilters>) => void;
};

export function BuyerSearch({ filters, result, pending, savedIds, onToggleSave, onFilters }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOnMove, setSearchOnMove] = useState(false);
  const photos = useMemo(
    () => Object.fromEntries(result.properties.map((p) => [p.id, p.photos[0] ? photoUrl(p.photos[0], "card") : undefined])),
    [result.properties],
  );
  const rent = filters.type === "for_rent";
  const bounds: Bounds | null =
    filters.north !== undefined && filters.south !== undefined && filters.east !== undefined && filters.west !== undefined
      ? { north: filters.north, south: filters.south, east: filters.east, west: filters.west }
      : null;

  return (
    <div className="by-results">
      <div className="by-results-head">
        <h2>
          <span>{String(result.total).padStart(2, "0")}</span> {rent ? "Rental" : "Property"} search{" "}
          {result.total === 1 ? "result" : "results"}
        </h2>
        <label className="by-sort">
          <span>Sort by</span>
          <select
            value={filters.sort}
            onChange={(e) => onFilters({ sort: e.target.value as PropertyFilters["sort"] })}
          >
            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="by-split" aria-busy={pending}>
        <div className="by-list">
          {result.properties.length ? (
            result.properties.map((p) => (
              <ResultRow
                key={p.id}
                property={p}
                active={p.id === hoverId || p.id === selectedId}
                saved={savedIds.has(p.id)}
                onHover={setHoverId}
                onToggleSave={() => onToggleSave(p)}
              />
            ))
          ) : (
            <div className="by-empty">
              <SearchX size={28} />
              <h3>No homes match these filters yet.</h3>
              <p>Try a wider budget, fewer bedrooms, or another market.</p>
            </div>
          )}

          {result.pageCount > 1 && (
            <nav className="by-pages" aria-label="Results pages">
              <button
                type="button"
                disabled={filters.page <= 1 || pending}
                onClick={() => onFilters({ page: filters.page - 1 })}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                Page {filters.page} of {result.pageCount}
              </span>
              <button
                type="button"
                disabled={filters.page >= result.pageCount || pending}
                onClick={() => onFilters({ page: filters.page + 1 })}
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
          {!rent && result.properties.length > 0 && (
            <p className="by-footnote">
              Est. payment is principal and interest only: {PAYMENT_ASSUMPTIONS.downPayment * 100}% down, {PAYMENT_ASSUMPTIONS.years}-year fixed at{" "}
              {(PAYMENT_ASSUMPTIONS.annualRate * 100).toFixed(2)}%. Excludes taxes, insurance, and HOA. Not a loan offer.
            </p>
          )}
        </div>

        <aside className="by-map" aria-label="Map of results">
          <ListingsMap
            points={result.points}
            bounds={bounds}
            activeId={hoverId}
            selectedId={selectedId}
            photos={photos}
            onHover={setHoverId}
            onSelect={setSelectedId}
            onUserMove={(b) => {
              if (searchOnMove) onFilters({ ...b, q: undefined });
            }}
          />
          <label className="map-move-toggle">
            <input type="checkbox" checked={searchOnMove} onChange={(e) => setSearchOnMove(e.target.checked)} />
            Search as I move the map
          </label>
          {pending && (
            <span className="map-loading" role="status">
              Updating results…
            </span>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResultRow({
  property: p,
  active,
  saved,
  onHover,
  onToggleSave,
}: {
  property: PropertyCard;
  active: boolean;
  saved: boolean;
  onHover: (id: string | null) => void;
  onToggleSave: () => void;
}) {
  const address = formatAddress(p);
  const rent = p.listing_type === "for_rent";
  const payment = rent ? null : estimateMonthlyPayment(p.price);
  const perSqft = p.price && p.sqft ? Math.round(p.price / p.sqft) : null;
  const category = homeCategory(p.home_type);
  const metrics: [string, string][] = [
    [rent ? "Monthly rent" : "Est. payment", rent ? formatPrice(p.price, "for_rent") : payment ? `${usd(payment)}/mo` : "—"],
    ["Price per sqft", perSqft ? usd(perSqft) : "—"],
  ];
  // Redfin rows have no days-on-market; show who lists the home instead of a blank.
  if (p.days_on_market !== null)
    metrics.push(["Days on market", p.days_on_market <= 1 ? "New today" : `${p.days_on_market} days`]);
  else if (p.broker_name) metrics.push(["Listed by", p.broker_name]);

  return (
    <article
      className={active ? "by-row is-active" : "by-row"}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(p.id)}
      onBlur={() => onHover(null)}
    >
      <div className="by-row-photo">
        <Link href={`/properties/${p.id}`} tabIndex={-1} aria-hidden="true">
          <PropertyImage key={p.photos[0]} src={p.photos[0] ? photoUrl(p.photos[0], "card") : undefined} alt="" />
        </Link>
        <span className="by-price-badge">{formatPrice(p.price, p.listing_type)}</span>
        <button
          type="button"
          className={saved ? "by-save is-saved" : "by-save"}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${address} from saved homes` : `Save ${address}`}
          onClick={onToggleSave}
        >
          <Heart size={17} />
        </button>
      </div>

      <div className="by-row-body">
        <Link href={`/properties/${p.id}`} className="by-row-title">
          <h3>{p.address_line || "Address on request"}</h3>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <p className="by-row-locality">
          {[p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
          {isApproximateLocation(p.address_line) && <span> · approx. location</span>}
        </p>
        <dl className="by-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="by-facts" aria-label="Home facts">
          <li>
            <BedDouble size={15} />
            {p.beds ?? "—"} beds
          </li>
          <li>
            <Bath size={15} />
            {p.baths ?? "—"} baths
          </li>
          <li>
            <Maximize size={14} />
            {p.sqft ? `${p.sqft.toLocaleString()} sqft` : "— sqft"}
          </li>
          <li>
            <House size={15} />
            {category ? HOME_CATEGORIES[category].single : "Home"}
          </li>
        </ul>
      </div>
    </article>
  );
}
