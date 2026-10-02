import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createImportSource, deleteImportSource, enrichPendingListings, toggleImportSource } from "./actions";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import listings" };

// Server actions here call HasData (detail enrichment can take a while).
export const maxDuration = 300;

export default async function AdminImportPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: jobs }, { data: sources }, { count: pendingDetails }] = await Promise.all([
    supabase
      .from("import_jobs")
      .select("id, provider, params, status, pages_fetched, listings_found, listings_upserted, details_fetched, credits_used, error, started_at")
      .order("started_at", { ascending: false })
      .limit(25),
    supabase
      .from("import_sources")
      .select("id, name, provider, keyword, listing_type, max_pages, is_active, last_run_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .is("details_fetched_at", null),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Import listings</h1>
        <p className="text-sm text-muted-foreground">
          Pull listings from Zillow or Redfin via HasData. Each page costs 10 credits.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Run a one-off import</h2>
        <ImportForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Full property details</h2>
        <p className="text-sm text-muted-foreground">
          {(pendingDetails ?? 0).toLocaleString()} listings have only search data (no description,
          full photo set, facts, or history). The daily cron fills in up to 50 per run.
        </p>
        <form action={enrichPendingListings} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="limit">Listings to fetch now</label>
            <input className="input w-32" id="limit" name="limit" type="number" min={1} max={50} defaultValue={10} />
          </div>
          <button className="btn" disabled={!pendingDetails}>Fetch details (10 credits each)</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Scheduled sources</h2>
        <p className="text-sm text-muted-foreground">Active sources are re-imported daily by the cron job.</p>
        <form action={createImportSource} className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-6">
          <input className="input col-span-2 md:col-span-1" name="name" placeholder="Name" required />
          <select className="input" name="provider" defaultValue="zillow">
            <option value="zillow">Zillow</option>
            <option value="redfin">Redfin</option>
          </select>
          <input className="input col-span-2 md:col-span-1" name="keyword" placeholder="Austin, TX" required />
          <select className="input" name="listingType" defaultValue="for_sale">
            <option value="for_sale">For sale</option>
            <option value="for_rent">For rent</option>
            <option value="sold">Sold</option>
          </select>
          <input className="input" name="maxPages" type="number" min={1} max={20} defaultValue={3} />
          <button className="btn">Add source</button>
        </form>

        {sources?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">Name</th><th>Provider</th><th>Keyword</th><th>Type</th><th>Pages</th><th>Last run</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((s) => (
                <tr key={s.id} className={s.is_active ? "" : "opacity-50"}>
                  <td className="py-2">{s.name}</td>
                  <td>{s.provider}</td>
                  <td>{s.keyword}</td>
                  <td>{s.listing_type}</td>
                  <td>{s.max_pages}</td>
                  <td>{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "—"}</td>
                  <td className="flex justify-end gap-2 py-2">
                    <form action={toggleImportSource}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="isActive" value={String(!s.is_active)} />
                      <button className="btn-outline">{s.is_active ? "Pause" : "Resume"}</button>
                    </form>
                    <form action={deleteImportSource}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn-outline">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No scheduled sources.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent import jobs</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">Started</th><th>Provider</th><th>Keyword</th><th>Status</th><th>Pages</th><th>Found</th><th>Saved</th><th>Details</th><th>Credits</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(jobs ?? []).map((j) => (
              <tr key={j.id} title={j.error ?? undefined}>
                <td className="py-2">{new Date(j.started_at).toLocaleString()}</td>
                <td>{j.provider}</td>
                <td>{(j.params as { keyword?: string }).keyword}</td>
                <td className={j.status === "failed" ? "text-red-600" : j.status === "running" ? "text-amber-600" : "text-primary"}>
                  {j.status}
                </td>
                <td>{j.pages_fetched}</td>
                <td>{j.listings_found}</td>
                <td>{j.listings_upserted}</td>
                <td>{j.details_fetched}</td>
                <td>{j.credits_used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
