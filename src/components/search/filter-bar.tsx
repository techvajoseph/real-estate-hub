"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { SaveSearchForm } from "@/components/save-search-form";
import {
  filtersToQuery,
  formatPriceShort,
  HOME_CATEGORIES,
  HOME_CATEGORY_KEYS,
  type HomeCategory,
} from "@/lib/listing-format";
import type { PropertyFilters } from "@/lib/properties";

type Props = { filters: PropertyFilters; signedIn: boolean };

const TYPE_LABELS = { for_sale: "For sale", for_rent: "For rent", sold: "Sold" } as const;
const BED_OPTIONS = [undefined, 1, 2, 3, 4, 5] as const;
const BATH_OPTIONS = [undefined, 1, 1.5, 2, 3, 4] as const;

export function FilterBar({ filters, signedIn }: Props) {
  const router = useRouter();

  /** Applies a change and resets to page 1. */
  const apply = (patch: Partial<PropertyFilters>) => {
    const qs = filtersToQuery({ ...filters, ...patch, page: 1 });
    router.push(qs ? `/properties?${qs}` : "/properties");
  };

  const onLocation = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    // A typed location replaces any map-drawn area.
    apply({ q: q || undefined, north: undefined, south: undefined, east: undefined, west: undefined });
  };

  const priceLabel =
    filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? `${filters.minPrice !== undefined ? formatPriceShort(filters.minPrice) : "No min"} – ${filters.maxPrice !== undefined ? formatPriceShort(filters.maxPrice) : "No max"}`
      : "Price";
  const bedsLabel =
    filters.minBeds !== undefined || filters.minBaths !== undefined
      ? `${filters.minBeds ?? 0}+ bd, ${filters.minBaths ?? 0}+ ba`
      : "Beds & baths";
  const typeCount = filters.homeTypes?.length ?? 0;
  const moreCount = Number(filters.minSqft !== undefined) + Number(filters.maxSqft !== undefined);

  return (
    <div className="filter-bar" role="search" aria-label="Filter homes">
      <form onSubmit={onLocation} className="filter-location">
        <label htmlFor="filter-q" className="sr-only">Address, neighborhood, city, or ZIP</label>
        <input
          id="filter-q"
          name="q"
          key={filters.q ?? ""}
          defaultValue={filters.q}
          placeholder={filters.north !== undefined ? "Map area" : "Address, neighborhood, city, ZIP"}
          autoComplete="off"
        />
        <button type="submit" aria-label="Search location"><Search size={18} /></button>
      </form>

      <FilterPopover label={TYPE_LABELS[filters.type ?? "for_sale"]} active={filters.type !== undefined && filters.type !== "for_sale"}>
        {(close) => (
          <fieldset className="filter-options">
            <legend>Listing type</legend>
            {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((t) => (
              <label key={t} className="filter-radio">
                <input
                  type="radio"
                  name="type"
                  checked={(filters.type ?? "for_sale") === t}
                  onChange={() => {
                    apply({ type: t });
                    close();
                  }}
                />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </fieldset>
        )}
      </FilterPopover>

      <FilterPopover label={priceLabel} active={priceLabel !== "Price"}>
        {(close) => (
          <RangeForm
            legend={filters.type === "for_rent" ? "Monthly rent" : "Price range"}
            names={["minPrice", "maxPrice"]}
            values={[filters.minPrice, filters.maxPrice]}
            step={filters.type === "for_rent" ? 100 : 10000}
            prefix="$"
            onApply={(min, max) => {
              apply({ minPrice: min, maxPrice: max });
              close();
            }}
          />
        )}
      </FilterPopover>

      <FilterPopover label={bedsLabel} active={bedsLabel !== "Beds & baths"}>
        {(close) => (
          <BedsBathsForm
            beds={filters.minBeds}
            baths={filters.minBaths}
            onApply={(minBeds, minBaths) => {
              apply({ minBeds, minBaths });
              close();
            }}
          />
        )}
      </FilterPopover>

      <FilterPopover label={typeCount ? `Home type (${typeCount})` : "Home type"} active={typeCount > 0}>
        {(close) => (
          <HomeTypeForm
            selected={filters.homeTypes ?? []}
            onApply={(homeTypes) => {
              apply({ homeTypes: homeTypes.length ? homeTypes : undefined });
              close();
            }}
          />
        )}
      </FilterPopover>

      <FilterPopover
        label={moreCount ? `More (${moreCount})` : "More"}
        icon={<SlidersHorizontal size={15} />}
        active={moreCount > 0}
      >
        {(close) => (
          <RangeForm
            legend="Square feet"
            names={["minSqft", "maxSqft"]}
            values={[filters.minSqft, filters.maxSqft]}
            step={100}
            onApply={(min, max) => {
              apply({ minSqft: min, maxSqft: max });
              close();
            }}
          />
        )}
      </FilterPopover>

      {signedIn ? (
        <Popover.Root>
          <Popover.Trigger className="btn filter-save">Save search</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="end" className="filter-positioner">
              <Popover.Popup className="filter-popup">
                <p className="filter-popup-title">Save this search</p>
                <SaveSearchForm filters={JSON.stringify({ ...filters, page: undefined })} />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <Link className="btn filter-save" href={`/login?next=${encodeURIComponent(`/properties?${filtersToQuery({ ...filters, page: 1 })}`)}`}>
          Save search
        </Link>
      )}
    </div>
  );
}

function FilterPopover({
  label,
  icon,
  active,
  children,
}: {
  label: string;
  icon?: ReactNode;
  active: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={active ? "filter-pill is-active" : "filter-pill"}>
        {icon}
        <span>{label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="filter-positioner">
          <Popover.Popup className="filter-popup">{children(() => setOpen(false))}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const toNumber = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return v === null || v === "" || !Number.isFinite(n) || n < 0 ? undefined : n;
};

function RangeForm({
  legend,
  names,
  values,
  step,
  prefix,
  onApply,
}: {
  legend: string;
  names: [string, string];
  values: [number | undefined, number | undefined];
  step: number;
  prefix?: string;
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="filter-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const min = toNumber(data.get(names[0]));
        const max = toNumber(data.get(names[1]));
        if (min !== undefined && max !== undefined && min > max) {
          setError("Minimum can't be more than maximum.");
          return;
        }
        onApply(min, max);
      }}
    >
      <fieldset>
        <legend>{legend}</legend>
        <div className="filter-range">
          <label>
            <span>Minimum</span>
            <span className="filter-input">
              {prefix && <i>{prefix}</i>}
              <input name={names[0]} type="number" inputMode="numeric" min={0} step={step} defaultValue={values[0]} placeholder="No min" />
            </span>
          </label>
          <span aria-hidden="true">–</span>
          <label>
            <span>Maximum</span>
            <span className="filter-input">
              {prefix && <i>{prefix}</i>}
              <input name={names[1]} type="number" inputMode="numeric" min={0} step={step} defaultValue={values[1]} placeholder="No max" />
            </span>
          </label>
        </div>
      </fieldset>
      {error && <p className="filter-error" role="alert">{error}</p>}
      <FormActions onReset={() => onApply(undefined, undefined)} />
    </form>
  );
}

function BedsBathsForm({
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
      className="filter-form"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(b, ba);
      }}
    >
      <Segmented legend="Bedrooms" options={BED_OPTIONS} value={b} onChange={setB} />
      <Segmented legend="Bathrooms" options={BATH_OPTIONS} value={ba} onChange={setBa} />
      <FormActions onReset={() => onApply(undefined, undefined)} />
    </form>
  );
}

function Segmented({
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
      <div className="filter-segmented">
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

function HomeTypeForm({ selected, onApply }: { selected: HomeCategory[]; onApply: (v: HomeCategory[]) => void }) {
  const [value, setValue] = useState<HomeCategory[]>(selected);
  const toggle = (c: HomeCategory) => setValue((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));
  return (
    <form
      className="filter-form"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(value);
      }}
    >
      <fieldset>
        <legend>Home type</legend>
        <div className="filter-checks">
          {HOME_CATEGORY_KEYS.map((c) => (
            <label key={c}>
              <input type="checkbox" checked={value.includes(c)} onChange={() => toggle(c)} />
              {HOME_CATEGORIES[c].label}
            </label>
          ))}
        </div>
      </fieldset>
      <FormActions onReset={() => onApply([])} />
    </form>
  );
}

function FormActions({ onReset }: { onReset: () => void }) {
  return (
    <div className="filter-actions">
      <button type="button" className="filter-reset" onClick={onReset}>Reset</button>
      <button type="submit" className="btn">Apply</button>
    </div>
  );
}
