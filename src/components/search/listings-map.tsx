"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Supercluster from "supercluster";
import type { LngLatBoundsLike } from "maplibre-gl";
import { Map, MapControls, MapMarker, MapPopup, MarkerContent, useMap } from "@/components/ui/map";
import {
  formatAddress,
  formatPrice,
  formatPriceShort,
  isApproximateLocation,
  listingLabel,
  type MapPoint,
} from "@/lib/listing-format";

export type Bounds = { north: number; south: number; east: number; west: number };

type Props = {
  points: MapPoint[];
  /** Viewport from the URL, if the user already searched by map area. */
  bounds: Bounds | null;
  activeId: string | null;
  selectedId: string | null;
  photos: Record<string, string | undefined>;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  /** Fired after the user (not code) pans/zooms the map. */
  onUserMove: (bounds: Bounds) => void;
};

const US_CENTER: [number, number] = [-98.5795, 39.8283];

/**
 * Maps being moved by code (fitting results, flying to a home) map to the time
 * until which their move events are not user searches. A time window survives
 * interrupted/restarted animations, which a simple flag does not.
 */
const programmaticUntil = new WeakMap<object, number>();
const isProgrammatic = (map: object) => (programmaticUntil.get(map) ?? 0) > performance.now();

function moveProgrammatically(map: object, move: () => void, durationMs = 0) {
  programmaticUntil.set(map, performance.now() + durationMs + 250);
  move();
}

export function ListingsMap({ points, bounds, activeId, selectedId, photos, onHover, onSelect, onUserMove }: Props) {
  const selected = selectedId ? points.find((p) => p.id === selectedId) : undefined;

  return (
    <Map theme="light" center={US_CENTER} zoom={3.5} className="listings-map">
      <FitToResults points={points} bounds={bounds} />
      <MoveListener onUserMove={onUserMove} />
      <MapControls position="bottom-right" showZoom showLocate />

      <FocusSelected point={selected} />
      <ClusteredPins points={points} activeId={activeId} selectedId={selectedId} onHover={onHover} onSelect={onSelect} />

      {selected && (
        <MapPopup
          key={selected.id}
          longitude={selected.longitude}
          latitude={selected.latitude}
          offset={34}
          closeButton
          onClose={() => onSelect(null)}
          className="map-popup"
        >
          <Link href={`/properties/${selected.id}`} className="map-popup-card">
            {photos[selected.id] && (
              // eslint-disable-next-line @next/next/no-img-element -- listing photos come from many CDNs
              <img src={photos[selected.id]} alt="" />
            )}
            <div>
              <strong>{formatPrice(selected.price, selected.listing_type)}</strong>
              <span>
                {[
                  selected.beds !== null && `${selected.beds} bd`,
                  selected.baths !== null && `${selected.baths} ba`,
                  selected.sqft !== null && `${selected.sqft.toLocaleString()} sqft`,
                ]
                  .filter(Boolean)
                  .join(" · ") || listingLabel(selected)}
              </span>
              <span className="map-popup-address">{formatAddress(selected)}</span>
              {isApproximateLocation(selected.address_line) && (
                <span className="map-popup-note">Approximate location (no street address)</span>
              )}
            </div>
          </Link>
        </MapPopup>
      )}
    </Map>
  );
}

type PinProps = Pick<Props, "points" | "activeId" | "selectedId" | "onHover" | "onSelect">;
type ClusterProps = { pointId?: string };

/**
 * Zoomed out, nearby homes merge into count bubbles (click to zoom in);
 * zoomed in, every home gets its own price pin at its exact coordinates.
 * The hovered/selected home always keeps its own pin so list ↔ map stays linked.
 */
function ClusteredPins({ points, activeId, selectedId, onHover, onSelect }: PinProps) {
  const { map, isLoaded } = useMap();
  const [view, setView] = useState<{ bbox: [number, number, number, number]; zoom: number } | null>(null);

  const index = useMemo(() => {
    const sc = new Supercluster<ClusterProps, ClusterProps>({ radius: 56, maxZoom: 13 });
    sc.load(
      points.map((p) => ({
        type: "Feature" as const,
        properties: { pointId: p.id },
        geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
      })),
    );
    return sc;
  }, [points]);
  const byId = useMemo(() => new globalThis.Map(points.map((p) => [p.id, p])), [points]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const update = () => {
      const b = map.getBounds();
      setView({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: Math.floor(map.getZoom()) });
    };
    update();
    map.on("moveend", update);
    return () => {
      map.off("moveend", update);
    };
  }, [map, isLoaded]);

  const features = view ? index.getClusters(view.bbox, view.zoom) : [];
  const shownIds = new Set<string>();
  const markers = features.map((f) => {
    const [lng, lat] = f.geometry.coordinates;
    if ("cluster" in f.properties && f.properties.cluster) {
      const clusterId = f.properties.cluster_id;
      const count = f.properties.point_count;
      return (
        <MapMarker
          key={`c${clusterId}`}
          longitude={lng}
          latitude={lat}
          onClick={(e) => {
            e.stopPropagation();
            if (!map) return;
            map.easeTo({ center: [lng, lat], zoom: Math.min(index.getClusterExpansionZoom(clusterId), 16) });
          }}
        >
          <MarkerContent>
            <span className="cluster-pin" role="button" tabIndex={0} aria-label={`${count} homes here. Zoom in`}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && map) {
                  e.preventDefault();
                  map.easeTo({ center: [lng, lat], zoom: Math.min(index.getClusterExpansionZoom(clusterId), 16) });
                }
              }}
            >
              {count}
            </span>
          </MarkerContent>
        </MapMarker>
      );
    }
    const point = f.properties.pointId ? byId.get(f.properties.pointId) : undefined;
    if (!point) return null;
    shownIds.add(point.id);
    return <PricePin key={point.id} point={point} active={point.id === activeId || point.id === selectedId} onHover={onHover} onSelect={onSelect} />;
  });

  // Keep the highlighted home visible even when it sits inside a cluster.
  for (const id of [activeId, selectedId]) {
    const point = id ? byId.get(id) : undefined;
    if (point && !shownIds.has(point.id)) {
      shownIds.add(point.id);
      markers.push(<PricePin key={point.id} point={point} active onHover={onHover} onSelect={onSelect} />);
    }
  }

  return <>{markers}</>;
}

function PricePin({
  point: p,
  active,
  onHover,
  onSelect,
}: {
  point: MapPoint;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  return (
    <MapMarker
      longitude={p.longitude}
      latitude={p.latitude}
      anchor="bottom"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(p.id);
      }}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
    >
      <MarkerContent className={active ? "price-pin-wrap is-active" : "price-pin-wrap"}>
        <span
          className="price-pin"
          role="button"
          tabIndex={0}
          aria-label={`${formatPrice(p.price, p.listing_type)}, ${formatAddress(p)}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(p.id);
            }
          }}
          onFocus={() => onHover(p.id)}
          onBlur={() => onHover(null)}
        >
          {formatPriceShort(p.price, p.listing_type)}
        </span>
      </MarkerContent>
    </MapMarker>
  );
}

/** Brings the selected home into view at street level (e.g. from a card's "show on map"). */
function FocusSelected({ point }: { point: MapPoint | undefined }) {
  const { map, isLoaded } = useMap();
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (!point) focused.current = null;
    if (!map || !isLoaded || !point || focused.current === point.id) return;
    focused.current = point.id; // effects can run twice in dev; fly once
    const inView = map.getBounds().contains([point.longitude, point.latitude]);
    if (inView && map.getZoom() >= 14) return;
    moveProgrammatically(
      map,
      () => map.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(map.getZoom(), 16), duration: 900 }),
      900,
    );
    // Only when a different home is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, point?.id]);
  return null;
}

/** Frames the results: the URL viewport if present, otherwise every pin. */
function FitToResults({ points, bounds }: { points: MapPoint[]; bounds: Bounds | null }) {
  const { map, isLoaded } = useMap();
  // Re-fit only when the result set changes, not on every hover re-render.
  const signature = bounds
    ? `b:${bounds.north},${bounds.south},${bounds.east},${bounds.west}`
    : `p:${points.length}:${points[0]?.id ?? ""}:${points.at(-1)?.id ?? ""}`;
  const lastSignature = useRef<string | null>(null);
  // True while the view is our automatic framing (no user pan/zoom since).
  const autoFramed = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const fit = (force = false) => {
      if (!force && lastSignature.current === signature) return;
      const { clientWidth, clientHeight } = map.getContainer();
      // Hidden map (mobile list view): framing a 0×0 canvas is meaningless; wait for a resize.
      if (clientWidth < 50 || clientHeight < 50) return;
      lastSignature.current = signature;

      // Coming from a map-area search: the user already chose this viewport.
      if (bounds) {
        const current = map.getBounds();
        const same =
          Math.abs(current.getNorth() - bounds.north) < 1e-4 && Math.abs(current.getWest() - bounds.west) < 1e-4;
        if (!same) moveProgrammatically(map, () => map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { duration: 0 }));
        return;
      }
      if (points.length === 0) return;
      autoFramed.current = true;
      if (points.length === 1) {
        moveProgrammatically(map, () => map.jumpTo({ center: [points[0].longitude, points[0].latitude], zoom: 14 }));
        return;
      }
      const lngs = points.map((p) => p.longitude);
      const lats = points.map((p) => p.latitude);
      const box: LngLatBoundsLike = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];
      // Clear the overlays: the move toggle (top-left), zoom controls (bottom-right),
      // and on phones the floating Map/List button (bottom-centre).
      // A tall sticky map can start partly below the fold; frame pins in the part
      // that is actually on screen so none hide below the viewport.
      const rect = map.getContainer().getBoundingClientRect();
      const belowFold = Math.max(0, Math.min(rect.bottom - window.innerHeight, clientHeight - 260));
      const padding = { top: 90, bottom: (clientWidth < 600 ? 100 : 70) + belowFold, left: 50, right: 70 };
      moveProgrammatically(map, () => map.fitBounds(box, { padding, maxZoom: 15, duration: 0 }));
    };

    // Layout can settle after the first fit (panels, fonts, sticky containers):
    // re-frame on resize until the user takes over the map.
    // (MapLibre's resize() itself emits movestart, so takeover is detected from
    // direct input events rather than movestart.)
    const onResize = () => fit(autoFramed.current);
    const takeOver = () => {
      autoFramed.current = false;
    };
    const inputs = ["dragstart", "wheel", "touchstart", "dblclick", "boxzoomstart"] as const;
    fit();
    map.on("resize", onResize);
    inputs.forEach((type) => map.on(type, takeOver));
    return () => {
      map.off("resize", onResize);
      inputs.forEach((type) => map.off(type, takeOver));
    };
  }, [map, isLoaded, signature, bounds, points]);

  return null;
}

/** Reports viewport changes caused by the user (drag, wheel, zoom buttons, locate, keyboard). */
function MoveListener({ onUserMove }: { onUserMove: (b: Bounds) => void }) {
  const { map } = useMap();
  const callback = useRef(onUserMove);
  useEffect(() => {
    callback.current = onUserMove;
  }, [onUserMove]);

  useEffect(() => {
    if (!map) return;
    let userInitiated = false;
    // Drags, wheel, zoom buttons, locate: anything except our own framing.
    const markUser = () => {
      if (!isProgrammatic(map)) userInitiated = true;
    };
    const onEnd = () => {
      if (!userInitiated || isProgrammatic(map)) return;
      userInitiated = false;
      const b = map.getBounds();
      const round = (n: number) => Math.round(n * 1e5) / 1e5;
      callback.current({ north: round(b.getNorth()), south: round(b.getSouth()), east: round(b.getEast()), west: round(b.getWest()) });
    };
    // MapLibre's resize() emits movestart → resize → moveend; that is layout, not the user.
    const onResize = () => {
      userInitiated = false;
      programmaticUntil.set(map, performance.now() + 250);
    };
    map.on("resize", onResize);
    map.on("movestart", markUser);
    map.on("zoomstart", markUser);
    map.on("moveend", onEnd);
    return () => {
      map.off("resize", onResize);
      map.off("movestart", markUser);
      map.off("zoomstart", markUser);
      map.off("moveend", onEnd);
    };
  }, [map]);

  return null;
}
