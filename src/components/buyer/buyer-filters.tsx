"use client";

import { useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown, X } from "lucide-react";
import {
  formatPriceShort,
  HOME_CATEGORIES,
  HOME_CATEGORY_KEYS,
  type HomeCategory,
} from "@/lib/listing-format";
import type { PropertyFilters } from "@/lib/properties";
import type { MarketStat } from "@/lib/buyer/types";

type Props = {
  filters: PropertyFilters;
  markets: MarketStat[];
  onChange: (patch: Partial<PropertyFilters>) => void;
  onClear: () => void;
};

const BUDGETS: { label: string; min?: number; max?: number }[] = [
  { label: "Any budget" },
  { label: "Under $300K", max: 300_000 },
  { label: "$300K – $500K", min: 300_000, max: 500_000 },
  { label: "$500K – $750K", min: 500_000, max: 750_000 },
  { label: "$750K – $1M", min: 750_000, max: 1_000_000 },
  { label: "$1M+", min: 1_000_000 },
];
const RENT_BUDGETS: { label: string; min?: number; max?: number }[] = [
  { label: "Any budget" },
  { label: "Under $2,000/mo", max: 2_000 },
  { label: "$2,000 – $3,000/mo", min: 2_000, max: 3_000 },
  { label: "$3,000 – $4,500/mo", min: 3_000, max: 4_500 },
  { label: "$4,500+/mo", min: 4_500 },
];
const SIZES: { label: string; min?: number; max?: number }[] = [
  { label: "Any size" },
  { label: "Under 1,000 sqft", max: 1_000 },
  { label: "1,000 – 2,000 sqft", min: 1_000, max: 2_000 },
  { label: "2,000 – 3,000 sqft", min: 2_000, max: 3_000 },
  { label: "3,000+ sqft", min: 3_000 },
];

export function BuyerFilters({ filters, markets, onChange, onClear }: Props) {
  const rent = filters.type === "for_rent";
  const budgets = rent ? RENT_BUDGETS : BUDGETS;
  const money = (n: number) => formatPriceShort(n, rent ? "for_rent" : undefined);
  const budgetValue =
    filters.minPrice === undefined && filters.maxPrice === undefined
      ? "Any budget"
      : filters.minPrice !== undefined && filters.maxPrice !== undefined
        ? `${money(filters.minPrice)} – ${money(filters.maxPrice)}`
        : filters.minPrice !== undefined
          ? `${money(filters.minPrice)}+`
          : `Under ${money(filters.maxPrice!)}`;
  const roomsValue =
    filters.minBeds === undefined && filters.minBaths === undefined
      ? "Any"
      : [filters.minBeds !== undefined && `${filters.minBeds}+ bd`, filters.minBaths !== undefined && `${filters.minBaths}+ ba`]
          .filter(Boolean)
          .join(", ");
  const sizeValue = SIZES.find((s) => s.min === filters.minSqft && s.max === filters.maxSqft)?.label ?? "Custom";
  const types = filters.homeTypes ?? [];
  const typeValue = !types.length
    ? "All home types"
    : types.length === 1
      ? HOME_CATEGORIES[types[0]].label
      : `${types.length} home types`;
  const marketValue = filters.q ?? (filters.north !== undefined ? "Map area" : "All markets");
  const filtered =
    filters.q ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.minBeds !== undefined ||
    filters.minBaths !== undefined ||
    filters.minSqft !== undefined ||
    filters.maxSqft !== undefined ||
    types.length > 0 ||
    filters.north !== undefined;

  return (
    <div className="by-filters" role="search" aria-label="Filter homes">
      <Field label="Looking to" value={rent ? "Rent" : "Buy"}>
        {(close) => (
          <Options
            options={[
              { label: "Buy a home", selected: !rent, pick: () => onChange({ type: "for_sale", minPrice: undefined, maxPrice: undefined }) },
              { label: "Rent a home", selected: rent, pick: () => onChange({ type: "for_rent", minPrice: undefined, maxPrice: undefined }) },
            ]}
            close={close}
          />
        )}
      </Field>

      <Field label="Budget range" value={budgetValue}>
        {(close) => (
          <Options
            options={budgets.map((b) => ({
              label: b.label,
              selected: b.min === filters.minPrice && b.max === filters.maxPrice,
              pick: () => onChange({ minPrice: b.min, maxPrice: b.max }),
            }))}
            close={close}
          />
        )}
      </Field>

      <Field label="Bedrooms & bathrooms" value={roomsValue}>
        {(close) => (
          <Rooms
            beds={filters.minBeds}
            baths={filters.minBaths}
            onApply={(minBeds, minBaths) => {
              onChange({ minBeds, minBaths });
              close();
            }}
          />
        )}
      </Field>

      <Field label="Home size" value={sizeValue}>
        {(close) => (
          <Options
            options={SIZES.map((s) => ({
              label: s.label,
              selected: s.min === filters.minSqft && s.max === filters.maxSqft,
              pick: () => onChange({ minSqft: s.min, maxSqft: s.max }),
            }))}
            close={close}
          />
        )}
      </Field>

      <Field label="Home type" value={typeValue}>
        {(close) => (
          <HomeTypes
            selected={types}
            onApply={(homeTypes) => {
              onChange({ homeTypes: homeTypes.length ? homeTypes : undefined });
              close();
            }}
          />
        )}
      </Field>

      <Field label="Market" value={marketValue}>
        {(close) => (
          <Options
            options={[
              {
                label: "All markets",
                selected: !filters.q && filters.north === undefined,
                pick: () => onChange({ q: undefined, north: undefined, south: undefined, east: undefined, west: undefined }),
              },
              // Only markets that actually have homes of the kind being searched.
              ...markets.filter((m) => (rent ? m.forRent : m.forSale) > 0).map((m) => ({
                label: `${m.city}, ${m.state}`,
                hint: `${(rent ? m.forRent : m.forSale).toLocaleString()} ${rent ? "rentals" : "for sale"}`,
                selected: filters.q === m.city,
                pick: () => onChange({ q: m.city, north: undefined, south: undefined, east: undefined, west: undefined }),
              })),
            ]}
            close={close}
          />
        )}
      </Field>

      {filtered && (
        <button type="button" className="by-clear" onClick={onClear}>
          <X size={15} /> Clear filters
        </button>
      )}
    </div>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="by-field">
        <span className="by-field-label">{label}</span>
        <span className="by-field-value">
          <span>{value}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="by-positioner">
          <Popover.Popup className="by-popup" aria-label={label}>
            {children(() => setOpen(false))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Options({
  options,
  close,
}: {
  options: { label: string; hint?: string; selected: boolean; pick: () => void }[];
  close: () => void;
}) {
  return (
    <div className="by-options">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={o.selected}
          className={o.selected ? "is-selected" : undefined}
          onClick={() => {
            o.pick();
            close();
          }}
        >
          <span>
            {o.label}
            {o.hint && <small>{o.hint}</small>}
          </span>
          {o.selected && <Check size={15} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

const BEDS = [undefined, 1, 2, 3, 4, 5] as const;
const BATHS = [undefined, 1, 2, 3, 4] as const;

function Rooms({
  beds,
  baths,
  onApply,
}: {
  beds: number | undefined;
  baths: number | undefined;
  onApply: (beds: number | undefined, baths: number | undefined) => void;
}) {
  const [b, setB] = useState(beds);
  const [ba, setBa] = useState(baths);
  return (
    <form
      className="by-rooms"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(b, ba);
      }}
    >
      <Segment legend="Bedrooms" options={BEDS} value={b} onChange={setB} />
      <Segment legend="Bathrooms" options={BATHS} value={ba} onChange={setBa} />
      <div className="by-actions">
        <button type="button" className="by-link" onClick={() => onApply(undefined, undefined)}>
          Reset
        </button>
        <button type="submit" className="by-apply">Apply</button>
      </div>
    </form>
  );
}

function Segment({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly (number | undefined)[];
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="by-segment">
        {options.map((o) => (
          <label key={o ?? "any"} className={value === o ? "is-selected" : undefined}>
            <input type="radio" name={legend} checked={value === o} onChange={() => onChange(o)} />
            {o === undefined ? "Any" : `${o}+`}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function HomeTypes({ selected, onApply }: { selected: HomeCategory[]; onApply: (v: HomeCategory[]) => void }) {
  const [value, setValue] = useState(selected);
  return (
    <form
      className="by-rooms"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(value);
      }}
    >
      <fieldset>
        <legend>Home type</legend>
        <div className="by-checks">
          {HOME_CATEGORY_KEYS.map((c) => (
            <label key={c}>
              <input
                type="checkbox"
                checked={value.includes(c)}
                onChange={() => setValue((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))}
              />
              {HOME_CATEGORIES[c].label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="by-actions">
        <button type="button" className="by-link" onClick={() => onApply([])}>
          Reset
        </button>
        <button type="submit" className="by-apply">Apply</button>
      </div>
    </form>
  );
}
