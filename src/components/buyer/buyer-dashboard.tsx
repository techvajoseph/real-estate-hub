"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Bell,
  CalendarDays,
  Check,
  Handshake,
  Heart,
  House,
  LayoutDashboard,
  MapPin,
  Map as MapIcon,
  Maximize,
  Menu,
  Plus,
  Search,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { AccountMenu, WorkspaceSelector } from "@/components/dashboard/account-menu";
import { PropertyImage } from "@/components/property-image";
import { BuyerFilters } from "./buyer-filters";
import { BuyerSearch } from "./buyer-search";
import { buyerSearch, setSavedHome } from "@/app/dashboard/buyer/actions";
import { updateWorkspace } from "@/app/dashboard/actions";
import { photoUrl } from "@/lib/photos";
import { formatPrice, type PropertyCard } from "@/lib/listing-format";
import { parseFilters, type PropertyFilters } from "@/lib/property-filters";
import { money, stageLabels, type DealStage, type SavedHome, type WorkspaceRole } from "@/lib/dashboard/types";
import type { BuyerData, BuyerSearchResult } from "@/lib/buyer/types";
import "./buyer.css";

type View = "search" | "markets" | "overview" | "saved" | "searches" | "viewings" | "offers";

const VIEW_NAMES: Record<View, string> = {
  search: "Search",
  markets: "Markets",
  overview: "Dashboard",
  saved: "Saved homes",
  searches: "Saved searches",
  viewings: "Viewings",
  offers: "My offers",
};
const DEFAULT_FILTERS: PropertyFilters = parseFilters({ type: "for_sale" });
const OPEN_STAGES: DealStage[] = ["lead", "viewing", "offer", "negotiating"];

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function BuyerDashboard({ initialData }: { initialData: BuyerData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("search");
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);
  const [result, setResult] = useState<BuyerSearchResult>(initialData.search);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();

  const savedIds = useMemo(() => new Set(data.homes.map((h) => h.id)), [data.homes]);
  const now = data.asOf;
  const upcoming = data.appointments
    .filter((a) => !a.completed && a.starts_at >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const openOffers = data.deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const firstName = data.name.split(" ")[0] || "there";

  // Mobile sidebar: Escape closes it and the page behind stops scrolling.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function go(next: View) {
    setView(next);
    setMobileOpen(false);
  }

  function runSearch(patch: Partial<PropertyFilters>, replace = false) {
    const next: PropertyFilters = replace
      ? { ...DEFAULT_FILTERS, ...patch, page: patch.page ?? 1 }
      : { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(next);
    startSearch(async () => {
      const res = await buyerSearch(next);
      if (res.data) setResult(res.data);
      else setNotice(res.error ?? "We couldn't load homes right now.");
    });
  }

  function changeRole(role: WorkspaceRole) {
    if (data.demo) {
      router.push("/dashboard/preview?role=" + role);
      return;
    }
    startSave(async () => {
      const res = await updateWorkspace({ action: "role", role });
      if (res.error) {
        setNotice(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function toggleSave(p: PropertyCard | SavedHome) {
    const saved = savedIds.has(p.id);
    const home: SavedHome =
      "listing_type" in p
        ? {
            id: p.id,
            address: p.address_line || "Saved home",
            city: [p.city, p.state].filter(Boolean).join(", "),
            price: p.price,
            photo: p.photos[0] ? photoUrl(p.photos[0], "card") : "",
            beds: p.beds,
            baths: p.baths,
            sqft: p.sqft,
            kind: p.listing_type === "for_rent" ? "rent" : "sale",
          }
        : p;
    const previous = data.homes;
    setData((d) => ({ ...d, homes: saved ? d.homes.filter((h) => h.id !== p.id) : [home, ...d.homes] }));
    if (data.demo) {
      setNotice(saved ? "Removed from saved homes (preview only)." : "Saved (preview only, nothing is stored).");
      return;
    }
    startSave(async () => {
      const res = await setSavedHome(p.id, !saved);
      if (res.error) {
        setData((d) => ({ ...d, homes: previous }));
        setNotice(res.error);
      } else setNotice(saved ? "Removed from saved homes." : "Saved to your homes.");
    });
  }

  /** Viewings, offers, saved searches: shared workspace action, merged back into buyer data. */
  function workspace(payload: Record<string, unknown>, localChange: (d: BuyerData) => BuyerData, success: string, onDone?: () => void) {
    if (data.demo) {
      setData(localChange);
      setNotice(success + " (preview only, nothing is stored).");
      onDone?.();
      return;
    }
    startSave(async () => {
      const res = await updateWorkspace(payload);
      if (res.error || !res.data) {
        setNotice(res.error ?? "We couldn't save that change.");
        return;
      }
      setData((d) => ({ ...d, ...res.data!, role: "buyer" }));
      setNotice(success);
      onDone?.();
    });
  }

  function runSavedSearch(href: string) {
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    runSearch(parseFilters(params), true);
    go("search");
  }

  const nav: { id: View; icon: typeof House; count?: number }[] = [
    { id: "search", icon: Search },
    { id: "overview", icon: LayoutDashboard },
    { id: "markets", icon: MapIcon },
  ];
  const journey: { id: View; icon: typeof House; count?: number }[] = [
    { id: "saved", icon: Heart, count: data.homes.length },
    { id: "searches", icon: Search, count: data.searches.length },
    { id: "viewings", icon: CalendarDays, count: upcoming.length },
    { id: "offers", icon: Handshake, count: openOffers.length },
  ];

  return (
    <div className="sol-dashboard by-page">
      {mobileOpen && <button className="dash-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={"dash-sidebar " + (mobileOpen ? "is-open" : "")} aria-label="Buyer navigation">
        <Link href="/" className="brand dash-brand" aria-label="SOL Real Estate home">
          <Sun strokeWidth={1.5} />
          <span>
            SOL<span className="brand-dot">.</span>
          </span>
          <span className="brand-caption">REAL ESTATE</span>
        </Link>
        <WorkspaceSelector role="buyer" pending={saving} onSwitch={changeRole} />
        <p className="nav-caption">FIND A HOME</p>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <item.icon size={18} />
              <span>{VIEW_NAMES[item.id]}</span>
            </button>
          ))}
        </nav>
        <p className="nav-caption">YOUR HOME JOURNEY</p>
        <nav>
          {journey.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <item.icon size={18} />
              <span>{VIEW_NAMES[item.id]}</span>
              {!!item.count && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-bottom">
          <div className="workspace-tip">
            <TrendingUp size={19} />
            <strong>Know your numbers.</strong>
            <p>Every home shows an estimated monthly payment, price per sqft, and days on market.</p>
            <button type="button" onClick={() => go("markets")}>
              Compare markets <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb">
            <button className="dash-icon dash-menu-toggle" onClick={() => setMobileOpen(true)} aria-label="Open dashboard navigation">
              <Menu size={20} />
            </button>
            <House size={15} />
            <span>/</span>
            <span>Buyer workspace</span>
            <span>/</span>
            <strong>{VIEW_NAMES[view]}</strong>
          </div>
          <div className="dash-top-actions">
            <Link href="/properties?type=for_sale">
              Marketplace <ArrowUpRight size={14} />
            </Link>
            <button
              className="dash-icon"
              aria-label={upcoming.length ? `${upcoming.length} upcoming viewings` : "No upcoming viewings"}
              onClick={() => go("viewings")}
            >
              <Bell size={19} />
              {!!upcoming.length && <i />}
            </button>
            <AccountMenu name={data.name} email={data.email} role="buyer" pending={saving} demo={data.demo} onSwitch={changeRole} />
          </div>
        </header>

        <div className="dash-content by-content">
          {data.demo && (
            <div className="dash-preview-banner">
              <span>
                <Heart size={14} />
                <strong>Interactive buyer preview</strong>
                <span>Real marketplace listings · sample saved homes, viewings, and offers · edits reset on reload</span>
              </span>
              <Link href="/dashboard">
                Open my workspace <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {notice && (
            <div className="by-notice" role="status">
              <span>{notice}</span>
              <button aria-label="Dismiss message" onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}

          {(view === "search" || view === "markets") && (
            <div className="by-tabs" role="tablist" aria-label="Search by">
              <button role="tab" aria-selected={view === "search"} className={view === "search" ? "is-active" : ""} onClick={() => go("search")}>
                <House size={16} /> Properties
              </button>
              <button role="tab" aria-selected={view === "markets"} className={view === "markets" ? "is-active" : ""} onClick={() => go("markets")}>
                <MapPin size={16} /> Markets
              </button>
            </div>
          )}

          {view === "search" && (
            <>
              <BuyerFilters
                filters={filters}
                markets={data.markets}
                onChange={(patch) => runSearch(patch)}
                onClear={() => runSearch({ type: filters.type }, true)}
              />
              <BuyerSearch
                filters={filters}
                result={result}
                pending={searching}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                onFilters={runSearch}
              />
            </>
          )}

          {view === "markets" && (
            <section aria-labelledby="markets-heading">
              <div className="by-section-head">
                <h1 id="markets-heading">
                  <span>{String(data.markets.length).padStart(2, "0")}</span> Markets on SOL
                </h1>
                <p>Live figures from active listings. Medians, so one outlier can&apos;t skew the picture.</p>
              </div>
              {data.markets.length ? (
                <div className="by-markets">
                  {data.markets.map((m) => (
                    <article key={m.key} className="by-market">
                      <header>
                        <span className="by-market-pin">
                          <MapPin size={18} />
                        </span>
                        <div>
                          <h2>{m.city}</h2>
                          <p>{m.state}</p>
                        </div>
                      </header>
                      <dl>
                        <div>
                          <dt>Homes for sale</dt>
                          <dd>{m.forSale.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Median price</dt>
                          <dd>{m.medianPrice ? usd(m.medianPrice) : "—"}</dd>
                        </div>
                        <div>
                          <dt>Median per sqft</dt>
                          <dd>{m.medianPricePerSqft ? usd(m.medianPricePerSqft) : "—"}</dd>
                        </div>
                        <div>
                          <dt>Median days listed</dt>
                          <dd>{m.medianDaysOnMarket !== null ? m.medianDaysOnMarket : "—"}</dd>
                        </div>
                        <div>
                          <dt>Price range</dt>
                          <dd>{m.minPrice && m.maxPrice ? `${money(m.minPrice, true)} – ${money(m.maxPrice, true)}` : "—"}</dd>
                        </div>
                        <div>
                          <dt>Rentals · median rent</dt>
                          <dd>{m.forRent ? `${m.forRent} · ${m.medianRent ? usd(m.medianRent) + "/mo" : "—"}` : "None listed"}</dd>
                        </div>
                      </dl>
                      <footer>
                        {m.forSale > 0 && (
                          <button
                            type="button"
                            className="by-apply"
                            onClick={() => {
                              runSearch({ type: "for_sale", q: m.city }, true);
                              go("search");
                            }}
                          >
                            Browse homes for sale
                          </button>
                        )}
                        {m.forRent > 0 && (
                          <button
                            type="button"
                            className="by-ghost"
                            onClick={() => {
                              runSearch({ type: "for_rent", q: m.city }, true);
                              go("search");
                            }}
                          >
                            Browse rentals
                          </button>
                        )}
                      </footer>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty icon={MapPin} title="No markets yet." text="Markets appear as listings are imported." />
              )}
            </section>
          )}

          {view === "overview" && (
            <section aria-labelledby="overview-heading">
              <div className="by-section-head by-section-head-row">
                <div>
                  <p className="by-eyebrow">YOUR HOME JOURNEY</p>
                  <h1 id="overview-heading">Welcome back, {firstName}.</h1>
                  <p>Here&apos;s where your search stands today.</p>
                </div>
                <button type="button" className="by-apply" onClick={() => go("search")}>
                  <Search size={15} /> Search homes
                </button>
              </div>
              <div className="by-kpis">
                {[
                  { label: "Saved homes", value: data.homes.length, icon: Heart, tone: "rose", view: "saved" as View },
                  { label: "Saved searches", value: data.searches.length, icon: Search, tone: "blue", view: "searches" as View },
                  { label: "Upcoming viewings", value: upcoming.length, icon: CalendarDays, tone: "amber", view: "viewings" as View },
                  { label: "Active offers", value: openOffers.length, icon: Handshake, tone: "green", view: "offers" as View },
                ].map((k) => (
                  <button key={k.label} type="button" className="by-kpi" onClick={() => go(k.view)}>
                    <span className={`by-kpi-icon ${k.tone}`}>
                      <k.icon size={18} />
                    </span>
                    <span className="by-kpi-label">{k.label}</span>
                    <strong>{String(k.value).padStart(2, "0")}</strong>
                  </button>
                ))}
              </div>
              <div className="by-overview-grid">
                <div className="by-panel">
                  <PanelHead title="Recently saved" action={data.homes.length ? () => go("saved") : undefined} />
                  {data.homes.length ? (
                    <div className="by-home-grid compact">
                      {data.homes.slice(0, 3).map((h) => (
                        <HomeCard key={h.id} home={h} onRemove={() => toggleSave(h)} />
                      ))}
                    </div>
                  ) : (
                    <Empty icon={Heart} title="No saved homes yet." text="Tap the heart on any home to keep it here." />
                  )}
                </div>
                <div className="by-panel">
                  <PanelHead title="Next viewings" action={() => go("viewings")} />
                  {upcoming.length ? (
                    <ul className="by-agenda">
                      {upcoming.slice(0, 4).map((a) => (
                        <li key={a.id}>
                          <CalendarDays size={16} />
                          <span>
                            <strong>{a.title}</strong>
                            <small>
                              {dateLabel(a.starts_at)}
                              {a.location && ` · ${a.location}`}
                            </small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty icon={CalendarDays} title="Nothing scheduled." text="Plan a viewing when a home catches your eye." />
                  )}
                </div>
              </div>
              {data.markets.length > 0 && (
                <div className="by-panel">
                  <PanelHead title="Markets at a glance" action={() => go("markets")} />
                  <table className="by-table">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>For sale</th>
                        <th>Median price</th>
                        <th>Median per sqft</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.markets.slice(0, 4).map((m) => (
                        <tr key={m.key}>
                          <td>
                            {m.city}, {m.state}
                          </td>
                          <td>{m.forSale}</td>
                          <td>{m.medianPrice ? usd(m.medianPrice) : "—"}</td>
                          <td>{m.medianPricePerSqft ? usd(m.medianPricePerSqft) : "—"}</td>
                          <td>
                            <button
                              type="button"
                              className="by-link"
                              onClick={() => {
                                runSearch({ type: m.forSale ? "for_sale" : "for_rent", q: m.city }, true);
                                go("search");
                              }}
                            >
                              Explore <ArrowUpRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {view === "saved" && (
            <section aria-labelledby="saved-heading">
              <div className="by-section-head">
                <h1 id="saved-heading">
                  <span>{String(data.homes.length).padStart(2, "0")}</span> Saved homes
                </h1>
                <p>Your shortlist. Prices refresh whenever listings are re-imported.</p>
              </div>
              {data.homes.length ? (
                <div className="by-home-grid">
                  {data.homes.map((h) => (
                    <HomeCard key={h.id} home={h} onRemove={() => toggleSave(h)} />
                  ))}
                </div>
              ) : (
                <Empty icon={Heart} title="No saved homes yet." text="Tap the heart on any home in Search to keep it here." action={() => go("search")} actionLabel="Start searching" />
              )}
            </section>
          )}

          {view === "searches" && (
            <section aria-labelledby="searches-heading">
              <div className="by-section-head">
                <h1 id="searches-heading">
                  <span>{String(data.searches.length).padStart(2, "0")}</span> Saved searches
                </h1>
                <p>Re-run a search here, or open it on the full Buy page.</p>
              </div>
              {data.searches.length ? (
                <ul className="by-list-panel">
                  {data.searches.map((s) => (
                    <li key={s.id}>
                      <span className="by-kpi-icon blue">
                        <Search size={16} />
                      </span>
                      <span className="by-grow">
                        <strong>{s.name}</strong>
                        <small>{describeSearch(s.href)}</small>
                      </span>
                      <button type="button" className="by-apply" onClick={() => runSavedSearch(s.href)}>
                        Run search
                      </button>
                      <Link href={s.href} className="by-ghost">
                        Open <ArrowUpRight size={13} />
                      </Link>
                      <button
                        type="button"
                        className="by-icon-btn"
                        aria-label={`Delete saved search ${s.name}`}
                        disabled={saving}
                        onClick={() =>
                          workspace(
                            { action: "remove_saved", id: s.id, kind: "search" },
                            (d) => ({ ...d, searches: d.searches.filter((x) => x.id !== s.id) }),
                            "Saved search removed.",
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon={Search} title="No saved searches yet." text="Use Save search on the Buy page to keep a set of filters." action={() => router.push("/properties?type=for_sale")} actionLabel="Open the Buy page" />
              )}
            </section>
          )}

          {view === "viewings" && (
            <ViewingsView data={data} upcoming={upcoming} saving={saving} workspace={workspace} />
          )}

          {view === "offers" && <OffersView data={data} saving={saving} workspace={workspace} />}
        </div>
      </div>
    </div>
  );
}

type WorkspaceFn = (payload: Record<string, unknown>, localChange: (d: BuyerData) => BuyerData, success: string, onDone?: () => void) => void;

function ViewingsView({
  data,
  upcoming,
  saving,
  workspace,
}: {
  data: BuyerData;
  upcoming: BuyerData["appointments"];
  saving: boolean;
  workspace: WorkspaceFn;
}) {
  const [error, setError] = useState("");
  const past = data.appointments
    .filter((a) => a.completed || a.starts_at < data.asOf)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const when = new Date(v.starts_at);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setError("Choose a date and time in the future.");
      return;
    }
    setError("");
    const starts_at = when.toISOString();
    workspace(
      { action: "appointment", title: v.title, location: v.location, starts_at },
      (d) => ({
        ...d,
        appointments: [...d.appointments, { id: crypto.randomUUID(), title: v.title, location: v.location, starts_at, completed: false }],
      }),
      "Viewing planned.",
      () => form.reset(),
    );
  }

  return (
    <section aria-labelledby="viewings-heading">
      <div className="by-section-head">
        <h1 id="viewings-heading">
          <span>{String(upcoming.length).padStart(2, "0")}</span> Upcoming viewings
        </h1>
        <p>Open houses and private tours, in one schedule.</p>
      </div>
      <div className="by-overview-grid">
        <div className="by-panel">
          <PanelHead title="Schedule" />
          {upcoming.length ? (
            <ul className="by-agenda">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <CalendarDays size={16} />
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {dateLabel(a.starts_at)}
                      {a.location && ` · ${a.location}`}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="by-ghost"
                    disabled={saving}
                    onClick={() =>
                      workspace(
                        { action: "complete", id: a.id, table: "workspace_appointments", completed: true },
                        (d) => ({ ...d, appointments: d.appointments.map((x) => (x.id === a.id ? { ...x, completed: true } : x)) }),
                        "Marked as visited.",
                      )
                    }
                  >
                    <Check size={14} /> Visited
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={CalendarDays} title="Nothing scheduled." text="Plan your first viewing with the form." />
          )}
          {past.length > 0 && (
            <>
              <p className="by-subhead">Past viewings</p>
              <ul className="by-agenda muted">
                {past.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <Check size={16} />
                    <span>
                      <strong>{a.title}</strong>
                      <small>{dateLabel(a.starts_at)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <form className="by-panel by-form" onSubmit={submit}>
          <PanelHead title="Plan a viewing" />
          <label>
            Home or open house
            <input name="title" required maxLength={120} placeholder="e.g. 6302 River Pl Blvd" />
          </label>
          <label>
            Location
            <input name="location" maxLength={240} placeholder="Address or meeting point" />
          </label>
          <label>
            Date and time
            <input name="starts_at" type="datetime-local" required />
          </label>
          {error && (
            <p className="by-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="by-apply" disabled={saving}>
            <Plus size={15} /> Add viewing
          </button>
        </form>
      </div>
    </section>
  );
}

function OffersView({ data, saving, workspace }: { data: BuyerData; saving: boolean; workspace: WorkspaceFn }) {
  const offers = [...data.deals].sort((a, b) => b.created_at.localeCompare(a.created_at));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const amount = Number(v.amount);
    workspace(
      { action: "deal", title: v.title, contact: v.contact, amount, kind: "sale", stage: "offer" },
      (d) => ({
        ...d,
        deals: [
          { id: crypto.randomUUID(), title: v.title, contact: v.contact, amount, kind: "sale", stage: "offer", created_at: new Date().toISOString(), closed_at: null },
          ...d.deals,
        ],
      }),
      "Offer recorded.",
      () => form.reset(),
    );
  }

  return (
    <section aria-labelledby="offers-heading">
      <div className="by-section-head">
        <h1 id="offers-heading">
          <span>{String(offers.filter((o) => OPEN_STAGES.includes(o.stage)).length).padStart(2, "0")}</span> Active offers
        </h1>
        <p>Track every offer from first viewing to closing.</p>
      </div>
      <div className="by-overview-grid">
        <div className="by-panel">
          <PanelHead title="Your offers" />
          {offers.length ? (
            <table className="by-table">
              <thead>
                <tr>
                  <th>Home</th>
                  <th>Offer</th>
                  <th>Agent</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>{o.title}</td>
                    <td>{usd(o.amount)}</td>
                    <td>{o.contact || "—"}</td>
                    <td>
                      <select
                        aria-label={`Stage for ${o.title}`}
                        value={o.stage}
                        disabled={saving}
                        className={`by-stage stage-${o.stage}`}
                        onChange={(e) => {
                          const stage = e.target.value as DealStage;
                          workspace(
                            { action: "stage", id: o.id, stage },
                            (d) => ({
                              ...d,
                              deals: d.deals.map((x) =>
                                x.id === o.id ? { ...x, stage, closed_at: stage === "closed" ? new Date().toISOString() : null } : x,
                              ),
                            }),
                            "Offer updated.",
                          );
                        }}
                      >
                        {(Object.keys(stageLabels) as DealStage[]).map((s) => (
                          <option key={s} value={s}>
                            {stageLabels[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty icon={Handshake} title="No offers yet." text="Record an offer when you're ready to make one." />
          )}
        </div>
        <form className="by-panel by-form" onSubmit={submit}>
          <PanelHead title="Record an offer" />
          <label>
            Home
            <input name="title" required maxLength={120} placeholder="e.g. 11905 Buckingham Rd" />
          </label>
          <label>
            Offer amount (USD)
            <input name="amount" type="number" required min={1} step={1} inputMode="numeric" />
          </label>
          <label>
            Listing agent
            <input name="contact" maxLength={120} placeholder="Name or brokerage" />
          </label>
          <button type="submit" className="by-apply" disabled={saving}>
            <Plus size={15} /> Add offer
          </button>
        </form>
      </div>
    </section>
  );
}

function HomeCard({ home, onRemove }: { home: SavedHome; onRemove: () => void }) {
  return (
    <article className="by-home">
      <div className="by-home-photo">
        <Link href={`/properties/${home.id}`} tabIndex={-1} aria-hidden="true">
          <PropertyImage key={home.photo} src={home.photo || undefined} alt="" />
        </Link>
        <span className="by-price-badge">{formatPrice(home.price, home.kind === "rent" ? "for_rent" : undefined)}</span>
        <button type="button" className="by-save is-saved" aria-label={`Remove ${home.address} from saved homes`} onClick={onRemove}>
          <Heart size={16} />
        </button>
      </div>
      <Link href={`/properties/${home.id}`} className="by-home-body">
        <strong>{home.address}</strong>
        <span>{home.city}</span>
        <ul className="by-facts">
          <li>
            <BedDouble size={14} />
            {home.beds ?? "—"}
          </li>
          <li>
            <Bath size={14} />
            {home.baths ?? "—"}
          </li>
          <li>
            <Maximize size={13} />
            {home.sqft ? home.sqft.toLocaleString() : "—"} sqft
          </li>
        </ul>
      </Link>
    </article>
  );
}

function PanelHead({ title, action }: { title: string; action?: () => void }) {
  return (
    <div className="by-panel-head">
      <h2>{title}</h2>
      {action && (
        <button type="button" className="by-link" onClick={action}>
          View all <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
  action,
  actionLabel,
}: {
  icon: typeof House;
  title: string;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="by-empty">
      <Icon size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button type="button" className="by-apply" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** "Austin · 3+ beds · under $500K" from a saved search URL. */
function describeSearch(href: string) {
  const p = new URL(href, "http://x").searchParams;
  const parts = [
    p.get("q"),
    p.get("type") === "for_rent" ? "Rentals" : p.get("type") === "for_sale" ? "For sale" : null,
    p.get("minBeds") && `${p.get("minBeds")}+ beds`,
    p.get("minPrice") && `from ${usd(Number(p.get("minPrice")))}`,
    p.get("maxPrice") && `up to ${usd(Number(p.get("maxPrice")))}`,
    p.get("homeTypes")?.split(",").join(", "),
  ].filter(Boolean);
  return parts.join(" · ") || "All homes";
}
