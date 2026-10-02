"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, List, Map as MapIcon } from "lucide-react";
import { ListingCard } from "./listing-card";
import { ListingsMap, type Bounds } from "./listings-map";
import { photoUrl } from "@/lib/photos";
import { filtersToQuery, SORT_OPTIONS, type MapPoint, type PropertyCard } from "@/lib/listing-format";
import type { PropertyFilters } from "@/lib/properties";

type Props = {
  filters: PropertyFilters;
  properties: PropertyCard[];
  points: MapPoint[];
  total: number;
  pageCount: number;
  pointLimitReached: boolean;
};

const HEADINGS = { all: "Real Estate & Homes", for_sale: "Real Estate & Homes For Sale", for_rent: "Homes For Rent", sold: "Recently Sold Homes" } as const;

export function SearchResults({ filters, properties, points, total, pageCount, pointLimitReached }: Props) {
  const router = useRouter();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOnMove, setSearchOnMove] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [pending, startTransition] = useTransition();

  const href = useCallback(
    (patch: Partial<PropertyFilters>) => {
      const qs = filtersToQuery({ ...filters, ...patch });
      return qs ? `/properties?${qs}` : "/properties";
    },
    [filters],
  );

  const photos = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.photos[0] ? photoUrl(p.photos[0], "card") : undefined])),
    [properties],
  );

  const onUserMove = useCallback(
    (b: Bounds) => {
      if (!searchOnMove) return;
      // Map area replaces the typed location, like Zillow's "Map area" search.
      startTransition(() => router.replace(href({ ...b, q: undefined, page: 1 }), { scroll: false }));
    },
    [searchOnMove, router, href],
  );

  const locate = (id: string) => {
    setSelectedId(id);
    setMobileView("map");
  };

  const heading = HEADINGS[filters.type ?? "all"];
  const place = filters.q ? ` in ${filters.q}` : filters.north !== undefined ? " in this map area" : "";

  return (
    <div className={`search-split view-${mobileView}`}>
      <section className="search-list-pane" aria-labelledby="results-heading" aria-busy={pending}>
        <header className="results-header">
          <div>
            <h1 id="results-heading">{heading}{place}</h1>
            <p>
              {total.toLocaleString()} {total === 1 ? "result" : "results"}
              {!pointLimitReached && points.length < total && (
                <span className="results-unmapped"> · {(total - points.length).toLocaleString()} without a map location</span>
              )}
            </p>
          </div>
          <label className="results-sort">
            <span>Sort:</span>
            <select value={filters.sort} onChange={(e) => router.push(href({ sort: e.target.value as PropertyFilters["sort"], page: 1 }))}>
              {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </header>

        {properties.length === 0 ? (
          <div className="results-empty">
            <h2>No matching results</h2>
            <p>Try zooming out on the map, changing your filters, or searching a different area.</p>
            <Link className="btn" href={href({ minPrice: undefined, maxPrice: undefined, minBeds: undefined, minBaths: undefined, homeTypes: undefined, minSqft: undefined, maxSqft: undefined, north: undefined, south: undefined, east: undefined, west: undefined, page: 1 })}>
              Remove filters
            </Link>
          </div>
        ) : (
          <div className="results-grid">
            {properties.map((p) => (
              <ListingCard key={p.id} property={p} active={p.id === hoverId || p.id === selectedId} onHover={setHoverId} onLocate={locate} />
            ))}
          </div>
        )}

        {pageCount > 1 && <Pagination page={filters.page} pageCount={pageCount} href={(page) => href({ page })} />}
      </section>

      <section className="search-map-pane" aria-label="Map of results">
        <ListingsMap
          points={points}
          bounds={
            filters.north !== undefined && filters.south !== undefined && filters.east !== undefined && filters.west !== undefined
              ? { north: filters.north, south: filters.south, east: filters.east, west: filters.west }
              : null
          }
          activeId={hoverId}
          selectedId={selectedId}
          photos={photos}
          onHover={setHoverId}
          onSelect={setSelectedId}
          onUserMove={onUserMove}
        />
        <label className="map-move-toggle">
          <input type="checkbox" checked={searchOnMove} onChange={(e) => setSearchOnMove(e.target.checked)} />
          Search as I move the map
        </label>
        {pending && <span className="map-loading" role="status">Updating results…</span>}
        {pointLimitReached && <span className="map-limit">Showing the first {points.length.toLocaleString()} homes. Zoom in to see more.</span>}
      </section>

      <button type="button" className="mobile-view-toggle" onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}>
        {mobileView === "list" ? <><MapIcon size={17} /> Map</> : <><List size={17} /> List</>}
      </button>
    </div>
  );
}

function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  // 1 … 4 5 [6] 7 8 … 20
  const pages = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pageCount])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav className="results-pagination" aria-label="Results pages">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></Link>
      ) : (
        <span aria-hidden="true" className="is-disabled"><ChevronLeft size={18} /></span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="results-page-group">
          {i > 0 && p - pages[i - 1] > 1 && <span className="results-gap">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined}>{p}</Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} aria-label="Next page"><ChevronRight size={18} /></Link>
      ) : (
        <span aria-hidden="true" className="is-disabled"><ChevronRight size={18} /></span>
      )}
    </nav>
  );
}
