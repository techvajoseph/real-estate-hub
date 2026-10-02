import type { Metadata } from "next";
import { FilterBar } from "@/components/search/filter-bar";
import { SearchResults } from "@/components/search/search-results";
import { getCurrentUser } from "@/lib/auth";
import { MAP_POINT_LIMIT, parseFilters, searchMapPoints, searchProperties } from "@/lib/properties";

export async function generateMetadata({ searchParams }: PageProps<"/properties">): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const kind = filters.type === "for_rent" ? "Homes for rent" : filters.type === "sold" ? "Recently sold homes" : "Homes for sale";
  return { title: filters.q ? `${kind} in ${filters.q}` : kind };
}

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const filters = parseFilters(await searchParams);
  const [{ properties, total, pageCount }, points, user] = await Promise.all([
    searchProperties(filters),
    searchMapPoints(filters),
    getCurrentUser(),
  ]);

  return (
    <div className="search-page">
      <FilterBar filters={filters} signedIn={!!user} />
      <SearchResults
        filters={filters}
        properties={properties}
        points={points}
        total={total}
        pageCount={pageCount}
        pointLimitReached={points.length >= MAP_POINT_LIMIT}
      />
    </div>
  );
}
