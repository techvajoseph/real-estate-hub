"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Result = {
  status: "succeeded" | "failed";
  pagesFetched: number;
  listingsFound: number;
  listingsUpserted: number;
  detailsFetched: number;
  creditsUsed: number;
  error?: string;
};

export function ImportForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const num = (k: string) => (form.get(k) ? Number(form.get(k)) : undefined);

    // Map form fields to HasData's bracket-style filter params.
    const filters: Record<string, number> = {};
    if (num("minPrice")) filters["price[min]"] = num("minPrice")!;
    if (num("maxPrice")) filters["price[max]"] = num("maxPrice")!;

    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: form.get("provider"),
          keyword: form.get("keyword"),
          listingType: form.get("listingType"),
          maxPages: num("maxPages") ?? 1,
          withDetails: form.get("withDetails") === "on",
          filters,
        }),
      });
      const body = await res.json();
      if (!res.ok && !body.status) throw new Error(JSON.stringify(body.error ?? body));
      setResult(body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-8">
        <div>
          <label className="label" htmlFor="provider">Source</label>
          <select className="input" id="provider" name="provider" defaultValue="zillow">
            <option value="zillow">Zillow</option>
            <option value="redfin">Redfin</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="keyword">Location</label>
          <input className="input" id="keyword" name="keyword" placeholder="Austin, TX or 78701" required />
        </div>
        <div>
          <label className="label" htmlFor="listingType">Type</label>
          <select className="input" id="listingType" name="listingType" defaultValue="for_sale">
            <option value="for_sale">For sale</option>
            <option value="for_rent">For rent</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="minPrice">Min price</label>
          <input className="input" id="minPrice" name="minPrice" type="number" min={0} />
        </div>
        <div>
          <label className="label" htmlFor="maxPrice">Max price</label>
          <input className="input" id="maxPrice" name="maxPrice" type="number" min={0} />
        </div>
        <div>
          <label className="label" htmlFor="maxPages">Pages</label>
          <input className="input" id="maxPages" name="maxPages" type="number" min={1} max={20} defaultValue={1} />
        </div>
        <div className="flex items-end">
          <button className="btn w-full" disabled={pending}>{pending ? "Importing…" : "Import"}</button>
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-8">
          <input type="checkbox" name="withDetails" />
          Also fetch full details (description, all photos, facts, history, schools). +10 credits per
          listing, up to 50 per run.
        </label>
      </form>

      {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {result && (
        <p className={`rounded-md p-3 text-sm ${result.status === "failed" ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"}`}>
          {result.status === "failed" ? `Failed: ${result.error}. ` : "Done. "}
          {result.pagesFetched} pages · {result.listingsFound} found · {result.listingsUpserted} saved · {result.detailsFetched} with full details · {result.creditsUsed} credits
        </p>
      )}
    </div>
  );
}
