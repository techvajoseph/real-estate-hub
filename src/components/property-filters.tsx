import type { PropertyFilters as Filters } from "@/lib/properties";

/** Plain GET form — filters live in the URL, so results are shareable and SSR'd. */
export function PropertyFilters({ filters }: { filters: Filters }) {
  return (
    <form method="get" action="/properties" className="property-filter-form grid grid-cols-2 gap-3 md:grid-cols-8">
      <div className="col-span-2 md:col-span-2">
        <label className="label" htmlFor="q">Location</label>
        <input className="input" id="q" name="q" placeholder="City, ZIP, address" defaultValue={filters.q} />
      </div>
      <div>
        <label className="label" htmlFor="type">Type</label>
        <select className="input" id="type" name="type" defaultValue={filters.type ?? ""}>
          <option value="">Any</option>
          <option value="for_sale">For sale</option>
          <option value="for_rent">For rent</option>
          <option value="sold">Sold</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="minPrice">Min price</label>
        <input className="input" id="minPrice" name="minPrice" type="number" min={0} step={1000} defaultValue={filters.minPrice} />
      </div>
      <div>
        <label className="label" htmlFor="maxPrice">Max price</label>
        <input className="input" id="maxPrice" name="maxPrice" type="number" min={0} step={1000} defaultValue={filters.maxPrice} />
      </div>
      <div>
        <label className="label" htmlFor="minBeds">Beds</label>
        <select className="input" id="minBeds" name="minBeds" defaultValue={filters.minBeds?.toString() ?? ""}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="sort">Sort</label>
        <select className="input" id="sort" name="sort" defaultValue={filters.sort}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="beds_desc">Most beds</option>
        </select>
      </div>
      <div className="flex items-end">
        <button className="btn w-full">Search</button>
      </div>
    </form>
  );
}
