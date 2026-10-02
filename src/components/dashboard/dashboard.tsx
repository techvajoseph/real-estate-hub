"use client";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  Handshake,
  Heart,
  House,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
  X,
  CheckCircle2,
  MapPin,
  MoreHorizontal,
  KeyRound,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu, WorkspaceSelector } from "@/components/dashboard/account-menu";
import { PropertyImage } from "@/components/property-image";
import { updateWorkspace } from "@/app/dashboard/actions";
import { signOut } from "@/app/login/actions";
import {
  money,
  monthlyActivity,
  stageLabels,
  statusLabels,
  summarize,
  type DashboardData,
  type WorkspaceRole,
  type Listing,
  type DealStage,
} from "@/lib/dashboard/types";
type Section =
  | "overview"
  | "listings"
  | "deals"
  | "rentals"
  | "analytics"
  | "saved"
  | "searches"
  | "calendar"
  | "settings";
type Modal = "listing" | "deal" | "appointment" | "task" | "help" | null;
const roleNames = { buyer: "Buyer", seller: "Seller", landlord: "Landlord" };
const sectionNames: Record<Section, string> = {
  overview: "Overview",
  listings: "My properties",
  deals: "Deals & offers",
  rentals: "Rental management",
  analytics: "Analytics",
  saved: "Saved homes",
  searches: "Saved searches",
  calendar: "My calendar",
  settings: "Workspace settings",
};
const buyerSectionNames: Partial<Record<Section, string>> = {
  deals: "My offers",
  analytics: "Market insights",
};
const sectionLabel = (section: Section, role: WorkspaceRole) =>
  (role === "buyer" && buyerSectionNames[section]) || sectionNames[section];
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Singapore",
  });
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  });
export function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [months, setMonths] = useState(6);
  const [listingFilter, setListingFilter] = useState("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>(".dash-sidebar");
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), select:not([disabled])",
        ) ?? [],
      );
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [mobileOpen]);
  const router = useRouter();
  const isBuyer = data.role === "buyer";
  const totals = summarize(data);
  const upcoming = data.appointments
    .filter((a) => !a.completed && a.starts_at >= data.asOf)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const chart = monthlyActivity(data.deals, months, new Date(data.asOf));
  const maxChart = Math.max(1, ...chart.flatMap((m) => [m.opened, m.closed]));
  const matches = (text: string) =>
    text.toLowerCase().includes(query.toLowerCase());
  const filteredListings = data.listings.filter(
    (l) =>
      matches(l.title + " " + l.address + " " + l.city) &&
      (listingFilter === "all" ||
        l.kind === listingFilter ||
        l.status === listingFilter),
  );
  const filteredDeals = data.deals.filter((d) =>
    matches(d.title + " " + d.contact),
  );
  const firstName =
    data.name === "Your workspace" ? "there" : data.name.split(" ")[0];
  const nav = isBuyer
    ? [
        { id: "overview" as Section, icon: LayoutDashboard, label: "Overview" },
        {
          id: "deals" as Section,
          icon: Handshake,
          label: "My offers",
          count: totals.openDeals,
        },
        { id: "analytics" as Section, icon: TrendingUp, label: "Market insights" },
      ]
    : [
        { id: "overview" as Section, icon: LayoutDashboard, label: "Overview" },
        { id: "listings" as Section, icon: Building2, label: "My listings" },
        {
          id: "deals" as Section,
          icon: Handshake,
          label: "Deals & offers",
          count: totals.openDeals,
        },
        { id: "analytics" as Section, icon: TrendingUp, label: "Analytics" },
      ];
  function navigate(next: Section) {
    setSection(next);
    setQuery("");
    setMobileOpen(false);
    setListingFilter("all");
  }
  function openModal(next: Modal, listing?: Listing) {
    setEditing(listing ?? null);
    setFormError("");
    setModal(next);
  }
  function closeModal() {
    setModal(null);
    setEditing(null);
  }
  function commit(
    payload: Record<string, unknown>,
    change: (current: DashboardData) => DashboardData,
    success = "Changes saved.",
  ) {
    startTransition(async () => {
      if (!data.demo) {
        try {
          const result = await updateWorkspace(payload);
          if (result.error) {
            setFormError(result.error);
            setNotice(result.error);
            return;
          }
          if (result.data) setData(result.data);
          router.refresh();
        } catch {
          setFormError("Connection interrupted. Please try again.");
          setNotice("Connection interrupted. Please try again.");
          return;
        }
      } else setData(change);
      setNotice(
        data.demo
          ? success + " Preview only; nothing was saved to your account."
          : success,
      );
      closeModal();
    });
  }
  function changeRole(role: WorkspaceRole) {
    if (role === "landlord" && data.demo) { router.push("/dashboard/preview?role=landlord"); return; }
    commit(
      { action: "role", role },
      (current) => ({ ...current, role }),
      "Workspace updated.",
    );
    setSection("overview");
    setMobileOpen(false);
  }
  function submitModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const id = crypto.randomUUID(),
      created_at = new Date().toISOString();
    if (modal === "listing") {
      const listing: Listing = {
        id: editing?.id || id,
        title: String(values.title),
        address: String(values.address),
        city: String(values.city),
        kind: values.kind as "sale" | "rent",
        price: Number(values.price),
        beds: Number(values.beds),
        baths: Number(values.baths),
        sqft: Number(values.sqft),
        status: values.status as Listing["status"],
        photo: String(values.photo || ""),
        created_at: editing?.created_at || created_at,
      };
      if (
        (listing.status === "rented" && listing.kind !== "rent") ||
        (["sold", "under_offer"].includes(listing.status) &&
          listing.kind !== "sale")
      ) {
        setFormError("Choose a status that matches the listing type.");
        return;
      }
      commit(
        {
          action: "listing",
          ...values,
          ...(editing ? { id: editing.id } : {}),
        },
        (current) => ({
          ...current,
          listings: editing
            ? current.listings.map((l) => (l.id === editing.id ? listing : l))
            : [listing, ...current.listings],
        }),
        editing ? "Property updated." : "Property added.",
      );
    }
    if (modal === "deal") {
      const stage = values.stage as DealStage;
      const deal = {
        id,
        title: String(values.title),
        contact: String(values.contact),
        amount: Number(values.amount),
        kind: values.kind as "sale" | "rent",
        stage,
        created_at,
        closed_at: stage === "closed" ? created_at : null,
      };
      commit(
        { action: "deal", ...values },
        (current) => ({ ...current, deals: [deal, ...current.deals] }),
        "Deal added.",
      );
    }
    if (modal === "appointment") {
      const date = new Date(String(values.starts_at) + ":00+08:00");
      if (
        !Number.isFinite(date.getTime()) ||
        date.getTime() <= new Date(created_at).getTime()
      ) {
        setFormError("Choose a date and time in the future.");
        return;
      }
      const appointment = {
        id,
        title: String(values.title),
        location: String(values.location),
        starts_at: date.toISOString(),
        completed: false,
      };
      commit(
        {
          action: "appointment",
          title: appointment.title,
          location: appointment.location,
          starts_at: appointment.starts_at,
        },
        (current) => ({
          ...current,
          appointments: [...current.appointments, appointment],
        }),
        "Added to your personal calendar.",
      );
    }
    if (modal === "task")
      commit(
        { action: "task", title: values.title },
        (current) => ({
          ...current,
          tasks: [
            { id, title: String(values.title), completed: false, created_at },
            ...current.tasks,
          ],
        }),
        "Task added.",
      );
  }
  function exportReport() {
    const cells = [
      ["Property", "Address", "City", "Type", "Price USD", "Status"],
      ...data.listings.map((l) => [
        l.title,
        l.address,
        l.city,
        l.kind,
        String(l.price),
        l.status,
      ]),
    ];
    const content = cells
      .map((row) =>
        row
          .map(
            (value) =>
              '"' +
              (/^[=+@\-\t\r]/.test(value) ? "'" : "") +
              value.replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sol-property-portfolio.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Your portfolio CSV is ready.");
  }
  const empty = (
    title: string,
    description: string,
    action?: () => void,
    label?: string,
  ) => (
    <div className="dash-empty">
      <House size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <Button onClick={action}>{label}</Button>}
    </div>
  );
  function listingTable(limit?: number, rentalsOnly = false) {
    const rows = filteredListings
      .filter((l) => !rentalsOnly || l.kind === "rent")
      .slice(0, limit);
    return rows.length ? (
      <div className="dash-table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Status</th>
              <th>Listing price</th>
              <th>Type</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="dash-property-cell">
                    <div className="dash-thumb">
                      <PropertyImage src={l.photo} alt={l.title} />
                    </div>
                    <div>
                      <button
                        onClick={() => openModal("listing", l)}
                        className="property-title"
                      >
                        {l.title}
                      </button>
                      <span>
                        <MapPin size={11} /> {l.city}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={"dash-status status-" + l.status}>
                    <i />
                    {statusLabels[l.status]}
                  </span>
                </td>
                <td className="dash-price">
                  {money(l.price)}
                  {l.kind === "rent" && <small> / mo</small>}
                </td>
                <td>
                  <span className="dash-type">
                    {l.kind === "sale" ? "For sale" : "For rent"}
                  </span>
                </td>
                <td>
                  <button
                    className="dash-icon"
                    onClick={() => openModal("listing", l)}
                    aria-label={"Edit " + l.title}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      empty(
        "Your next opportunity starts here.",
        query
          ? "No properties match your search."
          : "Add a property to start organizing your portfolio.",
        () => openModal("listing"),
        "Add a property",
      )
    );
  }
  function activityChart() {
    return (
      <div className="dash-panel activity-panel">
        <div className="dash-panel-heading">
          <div>
            <h2>Deal activity</h2>
            <p>A clearer picture of your progress.</p>
          </div>
          <select
            aria-label="Chart period"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={6}>Last 6 months</option>
            <option value={3}>Last 3 months</option>
          </select>
        </div>
        <div className="chart-summary">
          <strong>{chart.reduce((sum, m) => sum + m.opened, 0)}</strong>
          <span>deals opened in this period</span>
          <div className="chart-legend">
            <span>
              <i />
              Opened
            </span>
            <span>
              <i />
              Closed
            </span>
          </div>
        </div>
        <div
          className="dash-chart"
          role="img"
          aria-label={
            "Deals opened and closed over the last " + months + " months"
          }
        >
          <div className="chart-scale">
            {[maxChart, Math.round(maxChart / 2), 0].map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
          <div className="chart-bars">
            {chart.map((m) => (
              <div className="chart-month" key={m.label}>
                <div className="chart-column">
                  <div
                    className="bar-open"
                    style={{ height: (m.opened / maxChart) * 100 + "%" }}
                    title={m.label + ": " + m.opened + " opened"}
                  />
                  <div
                    className="bar-closed"
                    style={{ height: (m.closed / maxChart) * 100 + "%" }}
                    title={m.label + ": " + m.closed + " closed"}
                  />
                </div>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        <details className="chart-data">
          <summary>View chart data</summary>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Opened</th>
                <th>Closed</th>
              </tr>
            </thead>
            <tbody>
              {chart.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td>{m.opened}</td>
                  <td>{m.closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    );
  }
  function portfolioBreakdown() {
    const parts = isBuyer
      ? [
          {
            name: "Homes for sale",
            value: data.homes.filter((h) => h.kind === "sale").length,
            color: "#0041d9",
          },
          {
            name: "Homes for rent",
            value: data.homes.filter((h) => h.kind === "rent").length,
            color: "#8da8f1",
          },
        ]
      : [
          {
            name: "For sale",
            value: data.listings.filter(
              (l) =>
                l.kind === "sale" &&
                !["sold", "archived", "draft"].includes(l.status),
            ).length,
            color: "#0041d9",
          },
          {
            name: "For rent",
            value: data.listings.filter(
              (l) => l.kind === "rent" && l.status === "active",
            ).length,
            color: "#8da8f1",
          },
          {
            name: "Rented",
            value: data.listings.filter((l) => l.status === "rented").length,
            color: "#b5cbbd",
          },
          {
            name: "Other",
            value: data.listings.filter((l) =>
              ["sold", "archived", "draft"].includes(l.status),
            ).length,
            color: "#e5e8ef",
          },
        ];
    const total = parts.reduce((sum, p) => sum + p.value, 0);
    let offset = 0;
    return (
      <div className="dash-panel portfolio-panel">
        <div className="dash-panel-heading">
          <div>
            <h2>{isBuyer ? "Your shortlist" : "Portfolio overview"}</h2>
            <p>A space for every possibility.</p>
          </div>
          <Building2 size={17} />
        </div>
        <div className="donut-wrap">
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label={parts.map((p) => p.name + ": " + p.value).join(", ")}
          >
            <circle
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke="#eff1f5"
              strokeWidth="17"
            />
            {parts.map((p) => {
              const length = total ? (p.value / total) * 377 : 0;
              const segment = (
                <circle
                  key={p.name}
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke={p.color}
                  strokeWidth="17"
                  strokeDasharray={length + " " + (377 - length)}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 80 80)"
                />
              );
              offset += length;
              return segment;
            })}
          </svg>
          <div>
            <strong>{total}</strong>
            <span>{isBuyer ? "saved homes" : "total properties"}</span>
          </div>
        </div>
        <div className="portfolio-legend">
          {parts.map((p) => (
            <div key={p.name}>
              <span>
                <i style={{ background: p.color }} />
                {p.name}
              </span>
              <strong>{p.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }
  function savedHomes(limit?: number) {
    const homes = data.homes
      .filter((h) => matches(h.address + " " + h.city))
      .slice(0, limit);
    return homes.length ? (
      <div className="dash-home-grid">
        {homes.map((h) => (
          <article className="dash-home-card" key={h.id}>
            <div className="dash-home-photo">
              <PropertyImage src={h.photo} alt={h.address} />
              <button
                className="dash-icon"
                aria-label={"Remove saved home " + h.address}
                disabled={pending}
                onClick={() =>
                  commit(
                    { action: "remove_saved", id: h.id, kind: "home" },
                    (current) => ({
                      ...current,
                      homes: current.homes.filter((home) => home.id !== h.id),
                    }),
                    "Home removed from saved homes.",
                  )
                }
              >
                <Heart size={16} fill="currentColor" />
              </button>
            </div>
            <div>
              <strong>
                {h.price === null ? "Price on request" : money(h.price)}
                {h.kind === "rent" ? " / mo" : ""}
              </strong>
              <h3>{h.address}</h3>
              <p>{h.city}</p>
              <span>
                {h.beds ?? "—"} beds · {h.baths ?? "—"} baths ·{" "}
                {h.sqft?.toLocaleString() ?? "—"} sqft
              </span>
              <Link href={data.demo ? "/properties" : "/properties/" + h.id}>
                {data.demo ? "Explore real homes" : "View property"}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    ) : (
      empty(
        "Make room for your favorites.",
        "Save homes from the marketplace and find them all here.",
      )
    );
  }
  const metrics = isBuyer
    ? [
        {
          label: "Saved homes",
          value: String(data.homes.length),
          sub: "Your personal shortlist",
          icon: Heart,
          tone: "blue",
        },
        {
          label: "Active searches",
          value: String(data.searches.length),
          sub: "Ready to pick up where you left off",
          icon: Search,
          tone: "violet",
        },
        {
          label: "Open deals",
          value: String(totals.openDeals),
          sub: "Opportunities you’re tracking",
          icon: Handshake,
          tone: "green",
        },
        {
          label: "Planned appointments",
          value: String(upcoming.length),
          sub: "Your personal viewing calendar",
          icon: CalendarDays,
          tone: "amber",
        },
      ]
    : data.role === "landlord"
      ? [
          {
            label: "Rental properties",
            value: String(totals.rentalCount),
            sub: "Active and occupied units",
            icon: Building2,
            tone: "blue",
          },
          {
            label: "Scheduled monthly rent",
            value: money(totals.monthlyRent),
            sub: "Occupied units · not collected payments",
            icon: Wallet,
            tone: "violet",
          },
          {
            label: "Occupancy rate",
            value: totals.occupancy + "%",
            sub: "Rented units / available rental portfolio",
            icon: KeyRound,
            tone: "green",
          },
          {
            label: "Open deals",
            value: String(totals.openDeals),
            sub: "Across your personal pipeline",
            icon: Handshake,
            tone: "amber",
          },
        ]
      : [
          {
            label: "Active properties",
            value: String(totals.active).padStart(2, "0"),
            sub: "Active listings and under offer",
            icon: Building2,
            tone: "blue",
          },
          {
            label: "Sales pipeline",
            value: money(totals.pipeline, true),
            sub: "Open sale opportunities · not revenue",
            icon: Wallet,
            tone: "violet",
          },
          {
            label: "Closed sales",
            value: money(totals.sales, true),
            sub: totals.closed + " recorded sales · all time",
            icon: Handshake,
            tone: "green",
          },
          {
            label: "Planned appointments",
            value: String(upcoming.length).padStart(2, "0"),
            sub: "Your personal schedule",
            icon: CalendarDays,
            tone: "amber",
          },
        ];
  return (
    <div className="sol-dashboard">
      {mobileOpen && (
        <button
          className="dash-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={"dash-sidebar " + (mobileOpen ? "is-open" : "")}
        aria-label="Workspace navigation"
      >
        <Link href="/" className="brand dash-brand">
          <Sun strokeWidth={1.5} />
          <span>
            SOL<span className="brand-dot">.</span>
          </span>
          <span className="brand-caption">REAL ESTATE</span>
        </Link>
        <WorkspaceSelector
          role={data.role}
          pending={pending}
          onSwitch={changeRole}
        />
        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              aria-current={section === item.id ? "page" : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {"count" in item && !!item.count && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <p className="nav-caption">YOUR COLLECTION</p>
        <nav>
          {(
            [
              { id: "saved", icon: Heart, label: "Saved homes" },
              { id: "searches", icon: Search, label: "Saved searches" },
              { id: "calendar", icon: CalendarDays, label: "My calendar" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              aria-current={section === item.id ? "page" : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "saved" && data.homes.length > 0 && (
                <b>{data.homes.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-bottom">
          <div className="workspace-tip">
            <Sparkles size={19} />
            <strong>Your next chapter awaits.</strong>
            <p>Find a little more possibility in the marketplace.</p>
            <Link href="/properties">
              Explore homes <ArrowUpRight size={15} />
            </Link>
          </div>
          <nav>
            <button
              className={section === "settings" ? "active" : ""}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={18} />
              <span>Settings</span>
            </button>
            <button onClick={() => openModal("help")}>
              <CircleHelp size={18} />
              <span>Help & guidance</span>
              <ArrowUpRight size={13} />
            </button>
          </nav>
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb">
            <button
              className="dash-icon dash-menu-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open dashboard navigation"
            >
              <Menu size={20} />
            </button>
            <House size={15} />
            <span>/</span>
            <span>{roleNames[data.role]} workspace</span>
            <span>/</span>
            <strong>{sectionLabel(section, data.role)}</strong>
          </div>
          <div className="dash-top-actions">
            <Link href="/properties">
              Marketplace <ArrowUpRight size={14} />
            </Link>
            <div className="notification-wrap">
              <button
                className="dash-icon"
                aria-label="Show upcoming reminders"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {!!upcoming.length && <i />}
              </button>
              {notifications && (
                <div className="notification-panel">
                  <h3>Your reminders</h3>
                  {upcoming.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        navigate("calendar");
                        setNotifications(false);
                      }}
                    >
                      <CalendarDays size={16} />
                      <span>
                        <strong>{a.title}</strong>
                        <small>
                          {formatDate(a.starts_at)} · {formatTime(a.starts_at)}
                        </small>
                      </span>
                    </button>
                  ))}
                  {!upcoming.length && <p>You’re all caught up.</p>}
                </div>
              )}
            </div>
            <AccountMenu
              name={data.name}
              email={data.email}
              role={data.role}
              pending={pending}
              demo={data.demo}
              onSwitch={changeRole}
              onSettings={() => navigate("settings")}
            />
          </div>
        </header>
        <div className="dash-content" aria-label={sectionNames[section]}>
          {data.demo && (
            <div className="dash-preview-banner">
              <span>
                <Sparkles size={14} />
                <strong>Interactive preview</strong>
                <span>Sample data · Changes reset when you reload.</span>
              </span>
              <Link href="/dashboard">
                Open my workspace <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {!data.ready && (
            <div className="dash-error-banner" role="alert">
              Your workspace couldn’t load completely. Please refresh to try
              again. <Link href="/dashboard/preview">Explore the preview</Link>
            </div>
          )}
          <div className="dash-page-heading">
            <div>
              <p className="dash-eyebrow">
                {section === "overview"
                  ? "YOUR PROPERTY JOURNEY, SIMPLIFIED"
                  : roleNames[data.role].toUpperCase() + " WORKSPACE"}
              </p>
              <h1>
                {section === "overview"
                  ? "Welcome back, " + firstName + "."
                  : sectionNames[section]}
              </h1>
              <p>
                {section === "overview"
                  ? "A little clarity. A lot of possibility. Here’s where things stand."
                  : section === "listings"
                    ? "A thoughtful home for every property in your portfolio."
                    : section === "deals"
                      ? "From first conversation to the next chapter. Track every step."
                      : section === "rentals"
                        ? "Your rental portfolio, with the details in one place."
                        : section === "analytics"
                          ? "Understand the progress behind your next move."
                          : section === "calendar"
                            ? "Make room for what’s next. Your personal appointments."
                            : section === "saved"
                              ? "The places you can already picture yourself in."
                              : section === "searches"
                                ? "Pick up your search, right where you left off."
                                : "Make this space your own."}
              </p>
            </div>
            <div className="dash-heading-actions">
              {!isBuyer &&
                ["overview", "listings", "rentals", "analytics"].includes(
                  section,
                ) && (
                  <button className="dash-secondary" onClick={exportReport}>
                    <ArrowDownToLine size={15} />
                    <span>Export</span>
                  </button>
                )}
              {isBuyer && section === "overview" ? (
                <Link className="dash-primary" href="/properties">
                  <Search size={16} />
                  Explore homes
                </Link>
              ) : (
                section !== "settings" && (
                  <Button
                    className="dash-primary"
                    disabled={pending || !data.ready}
                    onClick={() =>
                      openModal(
                        section === "calendar"
                          ? "appointment"
                          : section === "deals" || isBuyer
                            ? "deal"
                            : "listing",
                      )
                    }
                  >
                    <Plus size={17} />
                    {section === "calendar"
                      ? "Plan appointment"
                      : section === "deals" || isBuyer
                        ? "Add a deal"
                        : "Add property"}
                  </Button>
                )
              )}
            </div>
          </div>
          {notice && (
            <div className="dash-notice" role="status">
              <CheckCircle2 size={16} />
              <span>{notice}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {(section === "overview" ||
            section === "analytics" ||
            section === "rentals") && (
            <div className="dash-metrics">
              {metrics.map((m) => (
                <div className="dash-metric" key={m.label}>
                  <div>
                    <span>{m.label}</span>
                    <span className={"metric-icon " + m.tone}>
                      <m.icon size={17} />
                    </span>
                  </div>
                  <strong>{m.value}</strong>
                  <p>
                    <span className="metric-dot" />
                    {m.sub}
                  </p>
                </div>
              ))}
            </div>
          )}
          {(section === "overview" || section === "analytics") && (
            <div className="dash-chart-grid">
              {activityChart()}
              {portfolioBreakdown()}
            </div>
          )}
          {section === "analytics" && (
            <div className="dash-panel analytics-notes">
              <h2>Behind the numbers</h2>
              <div>
                <p>
                  <strong>Sales volume</strong>Sum of sale deals you marked
                  closed. This is your recorded transaction value, not
                  commission or verified bank revenue.
                </p>
                <p>
                  <strong>Rental performance</strong>Scheduled rent comes from
                  units marked rented. Occupancy compares rented units with
                  active rental inventory; payment collection is not connected.
                </p>
                <p>
                  <strong>Personal records</strong>Charts reflect your manually
                  tracked deals. They are not market valuations or independently
                  verified transaction records.
                </p>
              </div>
            </div>
          )}
          {section === "overview" && (
            <div className="dash-lower-grid">
              <div className="dash-left-column">
                <div className="dash-panel">
                  <div className="dash-panel-heading">
                    <div>
                      <h2>
                        {isBuyer
                          ? "Places you’re drawn to"
                          : "Your property portfolio"}
                        <span className="heading-count">
                          {isBuyer ? data.homes.length : data.listings.length}
                        </span>
                      </h2>
                      <p>
                        {isBuyer
                          ? "A shortlist for your next chapter."
                          : "The details that keep you a step ahead."}
                      </p>
                    </div>
                    <button
                      className="dash-text-button"
                      onClick={() => navigate(isBuyer ? "saved" : "listings")}
                    >
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {isBuyer ? savedHomes(2) : listingTable(3)}
                </div>
                <div className="dash-panel task-panel">
                  <div className="dash-panel-heading">
                    <div>
                      <h2>Your next steps</h2>
                      <p>Small steps. Meaningful progress.</p>
                    </div>
                    <button
                      className="dash-icon"
                      aria-label="Add task"
                      onClick={() => openModal("task")}
                      disabled={!data.ready}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {data.tasks.length ? (
                    data.tasks.map((task) => (
                      <label
                        className={
                          "dash-task " + (task.completed ? "complete" : "")
                        }
                        key={task.id}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          disabled={pending}
                          onChange={() =>
                            commit(
                              {
                                action: "complete",
                                table: "workspace_tasks",
                                id: task.id,
                                completed: !task.completed,
                              },
                              (current) => ({
                                ...current,
                                tasks: current.tasks.map((t) =>
                                  t.id === task.id
                                    ? { ...t, completed: !t.completed }
                                    : t,
                                ),
                              }),
                            )
                          }
                        />
                        <span>{task.title}</span>
                        {task.completed && <Check size={14} />}
                      </label>
                    ))
                  ) : (
                    <p className="dash-inline-empty">
                      You have a clean slate. Add your first next step.
                    </p>
                  )}
                </div>
              </div>
              <div className="dash-right-column">
                <div className="dash-panel appointments-panel">
                  <div className="dash-panel-heading">
                    <div>
                      <h2>Coming up</h2>
                      <p>A little preparation goes a long way.</p>
                    </div>
                    <button
                      className="dash-icon"
                      aria-label="Plan appointment"
                      onClick={() => openModal("appointment")}
                      disabled={!data.ready}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {upcoming.length ? (
                    upcoming.slice(0, 3).map((a) => (
                      <div className="appointment-mini" key={a.id}>
                        <div className="date-tile">
                          <span>
                            {new Date(a.starts_at).toLocaleDateString("en-US", {
                              month: "short",
                              timeZone: "Asia/Singapore",
                            })}
                          </span>
                          <strong>
                            {new Date(a.starts_at).toLocaleDateString("en-US", {
                              day: "numeric",
                              timeZone: "Asia/Singapore",
                            })}
                          </strong>
                        </div>
                        <div>
                          <h3>{a.title}</h3>
                          <p>{a.location}</p>
                          <span>
                            <Clock3 size={11} />
                            {formatTime(a.starts_at)} SGT
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="dash-inline-empty">
                      No appointments planned yet.
                    </p>
                  )}
                  <button
                    className="calendar-link"
                    onClick={() => navigate("calendar")}
                  >
                    View calendar <ArrowRight size={14} />
                  </button>
                </div>
                <div className="dash-editorial-card">
                  <div className="editorial-shade" />
                  <div>
                    <span>THOUGHTFULLY CURATED</span>
                    <h3>
                      The right home.
                      <br />
                      The next chapter.
                    </h3>
                    <Link href="/properties">
                      Discover the collection <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {(section === "listings" || section === "rentals") && (
            <div className="dash-panel">
              <div className="dash-list-toolbar">
                <div className="dash-filter-tabs">
                  <button
                    className={listingFilter === "all" ? "active" : ""}
                    onClick={() => setListingFilter("all")}
                  >
                    All properties
                  </button>
                  {(section === "rentals"
                    ? ["active", "rented"]
                    : ["sale", "rent", "draft"]
                  ).map((f) => (
                    <button
                      key={f}
                      className={listingFilter === f ? "active" : ""}
                      onClick={() => setListingFilter(f)}
                    >
                      {f === "sale"
                        ? "For sale"
                        : f === "rent"
                          ? "For rent"
                          : f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <label className="dash-search">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search properties..."
                    aria-label="Search properties"
                  />
                </label>
              </div>
              {listingTable(undefined, section === "rentals")}
              <p className="dash-panel-footnote">
                <ShieldCheck size={13} />
                Private portfolio records. Adding or activating a property here
                does not publish it to the marketplace.
              </p>
            </div>
          )}
          {section === "deals" && (
            <>
              <div className="dash-section-toolbar">
                <div>
                  <span className="dash-pill">
                    <Circle size={9} />
                    {totals.openDeals} open opportunities
                  </span>
                  <span className="dash-subtle">
                    Private tracking · not submitted offers
                  </span>
                </div>
                <label className="dash-search">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a deal or contact..."
                    aria-label="Search deals"
                  />
                </label>
              </div>
              <div className="deal-board">
                {(
                  [
                    "lead",
                    "viewing",
                    "offer",
                    "negotiating",
                    "closed",
                    "lost",
                  ] as DealStage[]
                ).map((stage) => (
                  <section className="deal-lane" key={stage}>
                    <h2>
                      <i className={"stage-dot stage-" + stage} />
                      {stageLabels[stage]}
                      <span>
                        {filteredDeals.filter((d) => d.stage === stage).length}
                      </span>
                    </h2>
                    {filteredDeals
                      .filter((d) => d.stage === stage)
                      .map((d) => (
                        <article className="deal-card" key={d.id}>
                          <span className="deal-kind">
                            {d.kind === "sale" ? "HOME PURCHASE" : "RENTAL"}
                          </span>
                          <h3>{d.title}</h3>
                          <strong>
                            {money(d.amount)}
                            {d.kind === "rent" && <small> / mo</small>}
                          </strong>
                          <p>{d.contact || "No contact added"}</p>
                          <label>
                            <span className="sr-only">Stage for {d.title}</span>
                            <select
                              value={d.stage}
                              disabled={pending}
                              onChange={(e) => {
                                const next = e.target.value as DealStage;
                                commit(
                                  { action: "stage", id: d.id, stage: next },
                                  (current) => ({
                                    ...current,
                                    deals: current.deals.map((deal) =>
                                      deal.id === d.id
                                        ? {
                                            ...deal,
                                            stage: next,
                                            closed_at:
                                              next === "closed"
                                                ? deal.closed_at ||
                                                  new Date().toISOString()
                                                : null,
                                          }
                                        : deal,
                                    ),
                                  }),
                                  "Deal stage updated.",
                                );
                              }}
                            >
                              {Object.entries(stageLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </article>
                      ))}
                    {!filteredDeals.some((d) => d.stage === stage) && (
                      <div className="lane-empty">
                        Room for your next opportunity.
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
          {section === "saved" && (
            <>
              <div className="dash-section-toolbar">
                <span className="dash-subtle">
                  {data.homes.length} homes in your collection
                </span>
                <label className="dash-search">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search saved homes..."
                    aria-label="Search saved homes"
                  />
                </label>
              </div>
              {savedHomes()}
              <Link className="dash-text-button browse-more" href="/properties">
                Find more places to love <ArrowUpRight size={16} />
              </Link>
            </>
          )}
          {section === "searches" && (
            <div className="dash-panel">
              {data.searches.length
                ? data.searches.map((s) => (
                    <div className="saved-search-row" key={s.id}>
                      <span className="metric-icon blue">
                        <Search size={20} />
                      </span>
                      <div>
                        <h2>{s.name}</h2>
                        <p>Your saved filters, ready to explore.</p>
                      </div>
                      <Link href={s.href} className="dash-text-button">
                        View homes <ArrowUpRight size={15} />
                      </Link>
                      <button
                        className="dash-icon"
                        aria-label={"Remove search " + s.name}
                        disabled={pending}
                        onClick={() =>
                          commit(
                            {
                              action: "remove_saved",
                              kind: "search",
                              id: s.id,
                            },
                            (current) => ({
                              ...current,
                              searches: current.searches.filter(
                                (search) => search.id !== s.id,
                              ),
                            }),
                            "Saved search removed.",
                          )
                        }
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ))
                : empty(
                    "Keep a good search close.",
                    "Save your filters from the property browse page and return to them here.",
                  )}
              <Link href="/properties" className="calendar-link">
                Start a new search <ArrowRight size={15} />
              </Link>
            </div>
          )}
          {section === "calendar" && (
            <div className="dash-panel">
              <div className="dash-panel-heading">
                <div>
                  <h2>Your agenda</h2>
                  <p>
                    Times shown in Asia/Singapore. Personal plans do not send
                    invitations or book with agents.
                  </p>
                </div>
                <CalendarDays size={21} />
              </div>
              {data.appointments.length
                ? [...data.appointments]
                    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                    .map((a) => (
                      <div
                        className={
                          "agenda-row " + (a.completed ? "completed" : "")
                        }
                        key={a.id}
                      >
                        <div className="date-tile">
                          <span>{formatDate(a.starts_at).split(" ")[0]}</span>
                          <strong>
                            {formatDate(a.starts_at).split(" ")[1]}
                          </strong>
                        </div>
                        <div>
                          <h3>{a.title}</h3>
                          <p>
                            <MapPin size={13} />
                            {a.location || "Location to be confirmed"}
                          </p>
                        </div>
                        <span>
                          <Clock3 size={13} />
                          {formatTime(a.starts_at)}
                        </span>
                        <label>
                          <input
                            type="checkbox"
                            checked={a.completed}
                            disabled={pending}
                            onChange={() =>
                              commit(
                                {
                                  action: "complete",
                                  table: "workspace_appointments",
                                  id: a.id,
                                  completed: !a.completed,
                                },
                                (current) => ({
                                  ...current,
                                  appointments: current.appointments.map(
                                    (event) =>
                                      event.id === a.id
                                        ? {
                                            ...event,
                                            completed: !event.completed,
                                          }
                                        : event,
                                  ),
                                }),
                              )
                            }
                          />
                          Done
                        </label>
                      </div>
                    ))
                : empty(
                    "Make time for the next chapter.",
                    "Plan a viewing, an offer review, or a personal reminder.",
                    () => openModal("appointment"),
                    "Plan an appointment",
                  )}
            </div>
          )}
          {section === "settings" && (
            <div className="settings-grid">
              <div className="dash-panel settings-panel">
                <h2>Your account</h2>
                <p>A personal space for your property journey.</p>
                <dl>
                  <div>
                    <dt>Name</dt>
                    <dd>{data.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{data.email}</dd>
                  </div>
                  <div>
                    <dt>Account access</dt>
                    <dd>Only your own records</dd>
                  </div>
                </dl>
                {data.demo ? (
                  <Link href="/login" className="dash-primary">
                    Sign in to your account <ArrowUpRight size={15} />
                  </Link>
                ) : (
                  <form action={signOut}>
                    <button className="dash-secondary">Sign out</button>
                  </form>
                )}
              </div>
              <div className="dash-panel settings-panel">
                <h2>Choose your workspace</h2>
                <p>
                  Switch your focus. Your personal records stay with your
                  account.
                </p>
                {(["buyer", "seller", "landlord"] as WorkspaceRole[]).map(
                  (role) => (
                    <button
                      className={
                        "role-option " + (data.role === role ? "selected" : "")
                      }
                      key={role}
                      disabled={pending || !data.ready}
                      onClick={() => changeRole(role)}
                    >
                      <span className="metric-icon blue">
                        {role === "buyer" ? (
                          <Heart size={20} />
                        ) : role === "seller" ? (
                          <Building2 size={20} />
                        ) : (
                          <KeyRound size={20} />
                        )}
                      </span>
                      <span>
                        <strong>{roleNames[role]}</strong>
                        <small>
                          {role === "buyer"
                            ? "Shortlists, searches, viewings, and purchase tracking"
                            : role === "seller"
                              ? "Your inventory, sale opportunities, and analytics"
                              : "Rental inventory, occupancy, and scheduled rent"}
                        </small>
                      </span>
                      {data.role === role && <CheckCircle2 size={18} />}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
          <footer className="dash-footer">
            <span>
              <ShieldCheck size={13} />
              Your space. Your possibilities.
            </span>
            <span>
              SOL REAL ESTATE <span>·</span> Thoughtfully connected.
            </span>
          </footer>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="dash-dialog"
        onCancel={closeModal}
        aria-labelledby="workspace-dialog-title"
      >
        <div className="dash-dialog-heading">
          <div>
            <p className="dash-eyebrow">YOUR NEXT STEP</p>
            <h2 id="workspace-dialog-title">
              {modal === "listing"
                ? editing
                  ? "Edit your property"
                  : "Add a property"
                : modal === "deal"
                  ? "Track a new opportunity"
                  : modal === "appointment"
                    ? "Make a little room"
                    : modal === "task"
                      ? "What’s your next step?"
                      : "A little guidance"}
            </h2>
          </div>
          <button
            className="dash-icon"
            type="button"
            onClick={closeModal}
            aria-label="Close dialog"
          >
            <X size={21} />
          </button>
        </div>
        {modal === "help" ? (
          <div className="dashboard-help">
            <p>
              Choose a workspace to match your journey. Buyer focuses on saved
              homes and purchase tracking. Seller and Landlord add private
              property inventory and rental tools.
            </p>
            <p>
              Deals are your own records, not offers sent to an agent. Calendar
              items are personal plans. Portfolio records do not publish
              marketplace listings or collect payments.
            </p>
            <p>
              Your account’s records are private. Switching workspaces does not
              grant access to anyone else’s data.
            </p>
            <Link href="/properties" className="dash-primary">
              Explore the marketplace <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <form
            key={(modal || "") + (editing?.id || "")}
            onSubmit={submitModal}
            className="dash-form"
          >
            {modal === "listing" && (
              <>
                <p className="form-description">
                  Organize a property in your private portfolio. Marketplace
                  publishing is separate.
                </p>
                <label>
                  Property name
                  <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={editing?.title}
                    placeholder="e.g. The Palm Residence"
                  />
                </label>
                <label>
                  Street address
                  <input
                    name="address"
                    required
                    maxLength={240}
                    defaultValue={editing?.address}
                    placeholder="Street address, unit number"
                  />
                </label>
                <div className="form-two">
                  <label>
                    City / region
                    <input
                      name="city"
                      required
                      maxLength={120}
                      defaultValue={editing?.city}
                      placeholder="Los Angeles, CA"
                    />
                  </label>
                  <label>
                    Listing type
                    <select
                      aria-label="Listing type"
                      name="kind"
                      defaultValue={
                        editing?.kind ||
                        (data.role === "landlord" ? "rent" : "sale")
                      }
                    >
                      <option value="sale">For sale</option>
                      <option value="rent">For rent</option>
                    </select>
                  </label>
                </div>
                <div className="form-two">
                  <label>
                    Price (USD; monthly for rent)
                    <input
                      name="price"
                      type="number"
                      min="0"
                      max="10000000000"
                      step="0.01"
                      required
                      defaultValue={editing?.price}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Status
                    <select
                      aria-label="Status"
                      name="status"
                      defaultValue={editing?.status || "draft"}
                    >
                      {Object.entries(statusLabels).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-three">
                  <label>
                    Bedrooms
                    <input
                      name="beds"
                      type="number"
                      min="0"
                      max="100"
                      required
                      defaultValue={editing?.beds ?? 0}
                    />
                  </label>
                  <label>
                    Bathrooms
                    <input
                      name="baths"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      defaultValue={editing?.baths ?? 0}
                    />
                  </label>
                  <label>
                    Area (sqft)
                    <input
                      name="sqft"
                      type="number"
                      min="0"
                      max="100000000"
                      required
                      defaultValue={editing?.sqft ?? 0}
                    />
                  </label>
                </div>
                <label>
                  Photo URL (optional)
                  <input
                    name="photo"
                    type={data.demo ? "text" : "url"}
                    maxLength={2000}
                    defaultValue={editing?.photo}
                    placeholder="https://..."
                  />
                </label>
              </>
            )}
            {modal === "deal" && (
              <>
                <p className="form-description">
                  Track an opportunity for yourself. This does not submit or
                  send an offer.
                </p>
                <label>
                  Property or opportunity
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder="e.g. Modern Retreat"
                  />
                </label>
                <label>
                  Contact name (optional)
                  <input
                    name="contact"
                    maxLength={120}
                    placeholder="Who are you working with?"
                  />
                </label>
                <div className="form-two">
                  <label>
                    Type
                    <select aria-label="Deal type" name="kind">
                      <option value="sale">Sale / purchase</option>
                      <option value="rent">Rental</option>
                    </select>
                  </label>
                  <label>
                    Value (USD; monthly for rent)
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      max="10000000000"
                      step="0.01"
                      required
                      placeholder="0"
                    />
                  </label>
                </div>
                <label>
                  Current stage
                  <select aria-label="Current stage" name="stage">
                    {Object.entries(stageLabels).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {modal === "appointment" && (
              <>
                <p className="form-description">
                  Add a personal plan. No invitations are sent or bookings made
                  with agents.
                </p>
                <label>
                  Appointment title
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder="e.g. Private property viewing"
                  />
                </label>
                <label>
                  Location or meeting details
                  <input
                    name="location"
                    maxLength={240}
                    placeholder="Address or video call"
                  />
                </label>
                <label>
                  Date and time (Singapore, UTC+8)
                  <input name="starts_at" type="datetime-local" required />
                </label>
              </>
            )}
            {modal === "task" && (
              <label>
                Your next step
                <input
                  name="title"
                  required
                  maxLength={200}
                  placeholder="e.g. Prepare viewing documents"
                />
              </label>
            )}
            {formError && (
              <p className="dash-form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="dash-dialog-actions">
              <button
                type="button"
                className="dash-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
              <Button
                type="submit"
                className="dash-primary"
                disabled={pending || !data.ready}
              >
                {pending
                  ? "Saving…"
                  : data.demo
                    ? "Save in preview"
                    : "Save changes"}
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
