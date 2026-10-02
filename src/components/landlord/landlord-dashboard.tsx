"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bath,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  House,
  KeyRound,
  LayoutDashboard,
  Menu,
  TrendingUp,
  Users,
  Mail,
  MapPin,
  Maximize,
  Pencil,
  Phone,
  Plus,
  Search,
  Sun,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu, WorkspaceSelector } from "@/components/dashboard/account-menu";
import { PropertyImage } from "@/components/property-image";
import { LandlordCalendar } from "./landlord-calendar";
import { LandlordDialog, type LandlordModal } from "./landlord-dialog";
import { manageRental } from "@/app/dashboard/landlord/actions";
import { updateWorkspace } from "@/app/dashboard/actions";
import { money, type WorkspaceRole } from "@/lib/dashboard/types";
import {
  rentalHistory,
  rentalSummary,
  type LandlordData,
  type MarketRental,
  type Rental,
  type RentalTransaction,
} from "@/lib/landlord/types";
import "./landlord.css";

type View =
  | "Dashboard"
  | "Properties"
  | "Listings"
  | "Tenants"
  | "Transactions"
  | "Calendar"
  | "Analytics";
/** Sidebar / breadcrumb names for each view. */
const viewNames: Record<View, string> = {
  Dashboard: "Overview",
  Properties: "My rentals",
  Listings: "Rental listings",
  Tenants: "Tenants",
  Transactions: "Transactions",
  Calendar: "Calendar",
  Analytics: "Analytics",
};
const labels: Record<string, string> = {
  draft: "Draft",
  active: "Available",
  rented: "Occupied",
  archived: "Archived",
};
export function LandlordDashboard({
  initialData,
}: {
  initialData: LandlordData;
}) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chartProperty, setChartProperty] = useState("all");
  const [months, setMonths] = useState(6);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState<LandlordModal>(null);
  const [editing, setEditing] = useState<Rental | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<RentalTransaction | null>(null);
  const [date, setDate] = useState(data.asOf.slice(0, 10));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const rentals = data.listings.filter((p) => p.kind === "rent");
  const stats = rentalSummary(rentals, data.transactions, data.asOf);
  const featured = rentals[0] || data.suggestedRental;
  const detail = rentals.find((p) => p.id === detailId);
  const tenants = rentals.filter((p) => p.tenant_name);
  const chosenTransactions = data.transactions.filter(
    (t) => chartProperty === "all" || t.property_id === chartProperty,
  );
  const history = rentalHistory(chosenTransactions, data.asOf, months);
  const max = Math.max(
    1000,
    Math.ceil(
      Math.max(...history.map((m) => Math.max(m.income, m.expenses))) / 1000,
    ) * 1000,
  );
  const activeMonth = history.find((m) => m.key === hoveredMonth);
  const visibleRentals = rentals.filter(
    (p) =>
      (p.title + " " + p.city + " " + p.address)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || p.status === filter),
  );
  const visibleTransactions = data.transactions
    .filter(
      (t) =>
        (!detailId || t.property_id === detailId) &&
        (filter === "all" || t.status === filter || t.kind === filter) &&
        (
          t.description +
          " " +
          rentals.find((p) => p.id === t.property_id)?.title
        )
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const reminders = data.tasks.filter((t) => !t.completed);
  const importedIds = new Set(
    rentals.map((p) => p.source_property_id).filter(Boolean),
  );
  const visibleMarket = data.marketRentals.filter((m) =>
    (m.address + " " + m.city).toLowerCase().includes(query.toLowerCase()),
  );
  const alertCount = stats.overdue.length + stats.expiring.length;

  // Mobile sidebar: Escape closes it and the page behind stops scrolling.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);
  const canWrite = data.ready && data.rentalReady;
  function navigate(next: View) {
    setView(next);
    setMobileOpen(false);
    setFilter("all");
    setQuery("");
    setDetailId(null);
  }
  function open(
    next: LandlordModal,
    rental?: Rental,
    transaction?: RentalTransaction,
  ) {
    setEditing(rental ?? null);
    setEditingTransaction(transaction ?? null);
    setError("");
    setModal(next);
  }
  function close() {
    if (!pending) {
      setModal(null);
      setError("");
    }
  }
  function execute(
    payload: Record<string, unknown>,
    change: (current: LandlordData) => LandlordData,
    message: string,
    auxiliary = false,
  ) {
    startTransition(async () => {
      try {
        if (data.demo) setData(change);
        else {
          const result = auxiliary
            ? await updateWorkspace(payload)
            : await manageRental(payload);
          if (result.error) {
            setError(result.error);
            setNotice(result.error);
            return;
          }
          if (result.data)
            setData((current) => ({
              ...current,
              ...result.data,
              listings: result.data!.listings.filter((p) => p.kind === "rent"),
            }));
          router.refresh();
        }
        setNotice(
          message + (data.demo ? " Preview changes are temporary." : ""),
        );
        setModal(null);
        setError("");
      } catch {
        setError("We couldn’t connect. Please try again.");
        setNotice("We couldn’t connect. Please try again.");
      }
    });
  }
  function importRental(market?: MarketRental) {
    const source: Rental | null = market
      ? {
          id: "source-" + market.id,
          title: market.address,
          address: market.address,
          city: market.city,
          kind: "rent",
          price: market.price ?? 0,
          beds: market.beds ?? 0,
          baths: market.baths ?? 0,
          sqft: market.sqft ?? 0,
          status: "draft",
          photo: market.photo,
          created_at: data.asOf,
          source_property_id: market.id,
        }
      : data.suggestedRental;
    if (!source?.source_property_id) return;
    execute(
      { action: "import_rental", sourceId: source.source_property_id },
      (current) => ({
        ...current,
        listings: [{ ...source, id: crypto.randomUUID() }, ...current.listings],
      }),
      "Rental added as a private draft.",
    );
  }
  function submit(values: Record<string, FormDataEntryValue>) {
    if (modal === "property") {
      if (
        values.lease_start &&
        values.lease_end &&
        values.lease_end < values.lease_start
      ) {
        setError("Lease end must be on or after the start date.");
        return;
      }
      const rental: Rental = {
        id: editing?.id || crypto.randomUUID(),
        kind: "rent",
        title: String(values.title).trim(),
        address: String(values.address).trim(),
        city: String(values.city).trim(),
        price: Number(values.price),
        beds: Number(values.beds),
        baths: Number(values.baths),
        sqft: Number(values.sqft),
        status: values.status as Rental["status"],
        photo: String(values.photo),
        tenant_name: String(values.tenant_name).trim(),
        tenant_email: String(values.tenant_email),
        tenant_phone: String(values.tenant_phone),
        lease_start: String(values.lease_start) || null,
        lease_end: String(values.lease_end) || null,
        notes: String(values.notes),
        created_at: editing?.created_at || data.asOf,
        source_property_id: editing?.source_property_id,
      };
      execute(
        {
          action: "save_rental",
          values: { ...values, ...(editing ? { id: editing.id } : {}) },
        },
        (current) => ({
          ...current,
          listings: editing
            ? current.listings.map((p) => (p.id === editing.id ? rental : p))
            : [rental, ...current.listings],
        }),
        editing ? "Property updated." : "Property created.",
      );
    } else if (modal === "delete-property" && editing) {
      if (values.confirmation !== "DELETE") {
        setError("Type DELETE to confirm.");
        return;
      }
      execute(
        { action: "delete_rental", id: editing.id },
        (current) => ({
          ...current,
          listings: current.listings.filter((p) => p.id !== editing.id),
          transactions: current.transactions.filter(
            (t) => t.property_id !== editing.id,
          ),
        }),
        "Property and its ledger deleted.",
      );
      setDetailId(null);
      setChartProperty("all");
    } else if (modal === "transaction") {
      if (
        values.status === "paid" &&
        String(values.occurred_on) > data.asOf.slice(0, 10)
      ) {
        setError("Paid transactions cannot be dated in the future.");
        return;
      }
      const transaction: RentalTransaction = {
        id: editingTransaction?.id || crypto.randomUUID(),
        property_id: String(values.property_id),
        kind: values.kind as "rent" | "expense",
        description: String(values.description).trim(),
        amount: Number(values.amount),
        status: values.status as "paid" | "pending",
        occurred_on: String(values.occurred_on),
      };
      execute(
        {
          action: "save_transaction",
          values: {
            ...values,
            ...(editingTransaction ? { id: editingTransaction.id } : {}),
          },
        },
        (current) => ({
          ...current,
          transactions: editingTransaction
            ? current.transactions.map((t) =>
                t.id === editingTransaction.id ? transaction : t,
              )
            : [transaction, ...current.transactions],
        }),
        "Transaction saved.",
      );
    } else if (modal === "delete-transaction" && editingTransaction) {
      execute(
        { action: "delete_transaction", id: editingTransaction.id },
        (current) => ({
          ...current,
          transactions: current.transactions.filter(
            (t) => t.id !== editingTransaction.id,
          ),
        }),
        "Transaction deleted.",
      );
    } else if (modal === "task") {
      execute(
        { action: "task", title: values.title },
        (current) => ({
          ...current,
          tasks: [
            {
              id: crypto.randomUUID(),
              title: String(values.title).trim(),
              completed: false,
              created_at: data.asOf,
            },
            ...current.tasks,
          ],
        }),
        "Reminder added.",
        true,
      );
    } else if (modal === "appointment") {
      const starts = new Date(String(values.starts_at) + ":00+08:00");
      if (
        !Number.isFinite(starts.getTime()) ||
        starts.getTime() <= new Date(data.asOf).getTime()
      ) {
        setError("Choose a date and time in the future.");
        return;
      }
      execute(
        {
          action: "appointment",
          title: values.title,
          location: values.location,
          starts_at: starts.toISOString(),
        },
        (current) => ({
          ...current,
          appointments: [
            ...current.appointments,
            {
              id: crypto.randomUUID(),
              title: String(values.title),
              location: String(values.location),
              starts_at: starts.toISOString(),
              completed: false,
            },
          ],
        }),
        "Appointment added to your calendar.",
        true,
      );
    }
  }
  function selectDay(day: string) {
    setDate(day);
    open("appointment", detail);
  }
  function changeRole(role: WorkspaceRole) {
    if (data.demo) {
      router.push("/dashboard/preview?role=" + role);
      return;
    }
    startTransition(async () => {
      try {
        const result = await updateWorkspace({ action: "role", role });
        if (result.error) {
          setNotice(result.error);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setNotice("Couldn’t switch workspaces. Please try again.");
      }
    });
  }
  function exportLedger() {
    const rows = [
      ["Property", "Description", "Type", "Amount USD", "Status", "Date"],
      ...data.transactions.map((t) => [
        rentals.find((p) => p.id === t.property_id)?.title || "",
        t.description,
        t.kind,
        String(t.amount),
        t.status,
        t.occurred_on,
      ]),
    ];
    const csv = rows
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
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sol-rental-ledger.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function performance() {
    return (
      <section className="ll-panel ll-performance">
        <div className="ll-panel-heading">
          <div>
            <h2>Rental performance</h2>
            <div className="ll-chart-legend">
              <span>
                <i />
                Rent received
              </span>
              <span>
                <i />
                Expenses
              </span>
            </div>
          </div>
          <select
            aria-label="Performance period"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={6}>Last 6 months</option>
            <option value={3}>Quarterly</option>
            <option value={12}>Yearly</option>
          </select>
        </div>
        <div className="ll-chart-value">
          <strong>
            {money(
              activeMonth
                ? activeMonth.income
                : history.reduce((sum, m) => sum + m.income, 0),
            )}
          </strong>
          <span>
            {activeMonth
              ? activeMonth.label + " rent received"
              : "Recorded income · selected period"}
          </span>
        </div>
        <div className="ll-chart">
          <div className="ll-axis">
            {[1, 0.75, 0.5, 0.25, 0].map((v) => (
              <span key={v}>{money(max * v, true)}</span>
            ))}
          </div>
          <div className="ll-chart-columns">
            {history.map((month) => (
              <button
                key={month.key}
                className="ll-chart-month"
                aria-label={
                  month.label +
                  ": " +
                  money(month.income) +
                  " income, " +
                  money(month.expenses) +
                  " expenses"
                }
                onMouseEnter={() => setHoveredMonth(month.key)}
                onMouseLeave={() => setHoveredMonth(null)}
                onFocus={() => setHoveredMonth(month.key)}
                onBlur={() => setHoveredMonth(null)}
              >
                <span className="ll-bars">
                  <i style={{ height: (month.income / max) * 100 + "%" }} />
                  <i style={{ height: (month.expenses / max) * 100 + "%" }} />
                </span>
                <span>{month.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ll-chart-footer">
          <select
            aria-label="Performance property"
            value={chartProperty}
            onChange={(e) => setChartProperty(e.target.value)}
          >
            <option value="all">All rental properties</option>
            {rentals.map((p) => (
              <option value={p.id} key={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <details>
            <summary>View data</summary>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Rent</th>
                  <th>Expenses</th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>{money(m.income)}</td>
                    <td>{money(m.expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </section>
    );
  }
  function ledger(rows = visibleTransactions) {
    return rows.length ? (
      <div className="ll-table-scroll">
        <table className="ll-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Property</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.description}</strong>
                  <small>
                    {t.kind === "rent" ? "Rental income" : "Property expense"}
                  </small>
                </td>
                <td>
                  {rentals.find((p) => p.id === t.property_id)?.title ||
                    "Property unavailable"}
                </td>
                <td>{t.occurred_on}</td>
                <td className={t.kind === "rent" ? "ll-positive" : ""}>
                  {t.kind === "expense" ? "−" : "+"}
                  {money(t.amount)}
                </td>
                <td>
                  <span
                    className={
                      "ll-status " + (t.status === "paid" ? "rented" : "draft")
                    }
                  >
                    {t.status === "paid" ? "Paid" : "Pending"}
                  </span>
                </td>
                <td>
                  <div className="ll-row-actions">
                    {t.status === "pending" && (
                      <button
                        className="ll-icon-button"
                        aria-label={
                          "Record " + t.description + " as paid today"
                        }
                        disabled={pending || !canWrite}
                        onClick={() =>
                          execute(
                            { action: "mark_paid", id: t.id },
                            (current) => ({
                              ...current,
                              transactions: current.transactions.map((row) =>
                                row.id === t.id
                                  ? {
                                      ...row,
                                      status: "paid",
                                      occurred_on: data.asOf.slice(0, 10),
                                    }
                                  : row,
                              ),
                            }),
                            "Recorded as paid today.",
                          )
                        }
                      >
                        <Check size={15} />
                      </button>
                    )}
                    <button
                      className="ll-icon-button"
                      aria-label={"Edit transaction " + t.description}
                      disabled={!canWrite}
                      onClick={() => open("transaction", undefined, t)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="ll-icon-button delete"
                      aria-label={"Delete transaction " + t.description}
                      disabled={!canWrite}
                      onClick={() => open("delete-transaction", undefined, t)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="ll-empty">
        <Wallet size={28} />
        <h3>Your ledger starts here.</h3>
        <p>Record rent and expenses to see your rental performance.</p>
      </div>
    );
  }
  const sidebarNav: { id: View; icon: typeof House; count?: number }[] = [
    { id: "Dashboard", icon: LayoutDashboard },
    { id: "Properties", icon: House, count: rentals.length },
    { id: "Tenants", icon: Users, count: tenants.length },
    { id: "Transactions", icon: Wallet, count: stats.overdue.length },
    { id: "Calendar", icon: CalendarDays },
    { id: "Analytics", icon: TrendingUp },
  ];
  return (
    <div className="sol-dashboard ll-page">
      {mobileOpen && (
        <button
          className="dash-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={"dash-sidebar " + (mobileOpen ? "is-open" : "")}
        aria-label="Landlord navigation"
      >
        <Link
          href="/"
          className="brand dash-brand"
          aria-label="SOL Real Estate home"
        >
          <Sun strokeWidth={1.5} />
          <span>
            SOL<span className="brand-dot">.</span>
          </span>
          <span className="brand-caption">REAL ESTATE</span>
        </Link>
        <WorkspaceSelector
          role={"landlord"}
          pending={pending}
          onSwitch={changeRole}
        />
        <p className="nav-caption">RENTAL PORTFOLIO</p>
        <nav>
          {sidebarNav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              <span>{viewNames[item.id]}</span>
              {!!item.count && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <p className="nav-caption">MARKETPLACE</p>
        <nav>
          <button
            className={view === "Listings" ? "active" : ""}
            aria-current={view === "Listings" ? "page" : undefined}
            onClick={() => navigate("Listings")}
          >
            <Building2 size={18} />
            <span>{viewNames.Listings}</span>
            {!!data.marketRentals.length && <b>{data.marketRentals.length}</b>}
          </button>
          <Link href="/properties?type=for_rent">
            <Search size={18} />
            <span>Browse all rentals</span>
            <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="dash-sidebar-bottom">
          <div className="workspace-tip">
            <KeyRound size={19} />
            <strong>Add a rental in minutes.</strong>
            <p>Start from scratch, or import a listing from the marketplace.</p>
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => {
                setMobileOpen(false);
                open("property");
              }}
            >
              Add property <ArrowUpRight size={15} />
            </button>
          </div>
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
            <span>Landlord workspace</span>
            <span>/</span>
            <strong>{detail ? detail.title : viewNames[view]}</strong>
          </div>
          <div className="dash-top-actions">
            <Link href="/properties?type=for_rent">
              Rental marketplace <ArrowUpRight size={14} />
            </Link>
            <div className="notification-wrap">
              <button
                className="dash-icon"
                aria-label={
                  alertCount
                    ? alertCount + " rental reminders: view pending payments"
                    : "No rental reminders"
                }
                onClick={() => {
                  navigate("Transactions");
                  setFilter("pending");
                }}
              >
                <Bell size={19} />
                {!!alertCount && <i />}
              </button>
            </div>
            <AccountMenu
              name={data.name}
              email={data.email}
              role="landlord"
              pending={pending}
              demo={data.demo}
              onSwitch={changeRole}
            />
          </div>
        </header>
        <div className="dash-content ll-content">
        {data.demo && (
          <div className="dash-preview-banner">
            <span>
              <KeyRound size={14} />
              <strong>Interactive landlord preview</strong>
              <span>
                Real source rentals · sample tenants and financials · edits
                reset on reload
              </span>
            </span>
            <Link href="/dashboard">
              Open my workspace <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        {(!data.ready || !data.rentalReady) && (
          <div className="ll-notice warning" role="alert">
            Rental management is temporarily unavailable. Your saved properties
            remain visible. Please refresh after the workspace update.
          </div>
        )}
        {notice && (
          <div className="ll-notice" role="status">
            <span>{notice}</span>
            <button aria-label="Dismiss message" onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        <h1 className="sr-only">Landlord {view.toLowerCase()}</h1>
        {(view === "Dashboard" || view === "Analytics") && (
          <section
            className="ll-metric-band"
            aria-label="Rental portfolio summary"
          >
            {[
              {
                title: "Rental properties",
                value: String(stats.properties).padStart(2, "0"),
                icon: House,
                badge: stats.occupied + " occupied",
              },
              {
                title: "Rent collected",
                value: money(stats.income),
                icon: Wallet,
                badge: "This month",
              },
              {
                title: "Occupancy rate",
                value: stats.occupancy + "%",
                icon: Building2,
                badge: "Active portfolio",
              },
              {
                title: "Net rental income",
                value: money(stats.net),
                icon: KeyRound,
                badge: "After expenses",
              },
            ].map((metric) => (
              <div className="ll-metric" key={metric.title}>
                <div>
                  <span>
                    <metric.icon size={18} />
                  </span>
                  <h2>{metric.title}</h2>
                </div>
                <div>
                  <strong>{metric.value}</strong>
                  <span className="ll-metric-badge">
                    {metric.badge}
                    <ArrowUpRight size={10} />
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
        {view === "Dashboard" && (
          <>
            <div className="ll-main-grid">
              <section className="ll-panel ll-featured">
                {featured ? (
                  <>
                    <div className="ll-featured-image">
                      <PropertyImage
                        key={featured.photo}
                        src={featured.photo}
                        alt={featured.title}
                      />
                      <button
                        className="ll-image-open"
                        aria-label={"View property " + featured.title}
                        onClick={() => {
                          navigate("Properties");
                          if (rentals.length) setDetailId(featured.id);
                        }}
                      >
                        <ArrowUpRight size={19} />
                      </button>
                      <span className="ll-image-badge">
                        <i />
                        {rentals.length
                          ? labels[featured.status]
                          : "Selected from the rental marketplace"}
                      </span>
                      {featured.source_property_id && (
                        <Link
                          className="ll-source-link"
                          href={"/properties/" + featured.source_property_id}
                        >
                          View source <ArrowUpRight size={12} />
                        </Link>
                      )}
                    </div>
                    <div className="ll-featured-footer">
                      <div>
                        <h2>{featured.title}</h2>
                        <p>
                          {featured.city} · {money(featured.price)}/mo
                        </p>
                      </div>
                      {rentals.length ? (
                        <div className="ll-feature-facts">
                          <span>
                            <strong>{featured.beds}</strong>Beds
                          </span>
                          <span>
                            <strong>{featured.baths}</strong>Baths
                          </span>
                          <span>
                            <strong>
                              {featured.sqft
                                ? featured.sqft.toLocaleString()
                                : "—"}
                            </strong>
                            Sqft
                          </span>
                        </div>
                      ) : (
                        <Button
                          className="ll-button"
                          disabled={pending || !canWrite}
                          onClick={() => importRental()}
                        >
                          <Plus size={15} />
                          Add to portfolio
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="ll-empty">
                    <House size={34} />
                    <h2>A home for every rental.</h2>
                    <p>
                      Add your first property to bring your portfolio to life.
                    </p>
                    <Button
                      className="ll-button"
                      onClick={() => open("property")}
                      disabled={!canWrite}
                    >
                      Add property
                    </Button>
                  </div>
                )}
              </section>
              {performance()}
            </div>
            <div className="ll-bottom-grid">
              <section className="ll-panel ll-contacts">
                <div className="ll-panel-heading">
                  <h2>Tenant contacts</h2>
                  <button
                    className="ll-icon-button"
                    aria-label="View all tenants"
                    onClick={() => navigate("Tenants")}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                {tenants.length ? (
                  tenants.slice(0, 3).map((tenant, i) => (
                    <div className="ll-contact" key={tenant.id}>
                      <span className={"ll-contact-avatar tone-" + (i % 3)}>
                        {tenant.tenant_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <strong>{tenant.tenant_name}</strong>
                        <p>{tenant.title}</p>
                      </div>
                      <button
                        className="ll-icon-button"
                        aria-label={"View tenant " + tenant.tenant_name}
                        onClick={() => {
                          navigate("Properties");
                          setDetailId(tenant.id);
                        }}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="ll-small-empty">
                    <p>Your tenant contacts will appear here.</p>
                    <button onClick={() => navigate("Properties")}>
                      Add lease details <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </section>
              <section className="ll-panel ll-reminders">
                <div className="ll-panel-heading">
                  <h2>Reminders</h2>
                  <button
                    className="ll-icon-button"
                    aria-label="Add reminder"
                    onClick={() => open("task")}
                    disabled={!data.ready}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  className="ll-reminder highlighted"
                  onClick={() => {
                    navigate("Transactions");
                    setFilter("pending");
                  }}
                >
                  <span>
                    <strong>Rent follow-ups</strong>
                    <small>
                      {stats.overdue.length
                        ? stats.overdue.length +
                          " overdue rental payments to review"
                        : "You’re up to date on recorded rent"}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="ll-reminder"
                  onClick={() => navigate("Calendar")}
                >
                  <span>
                    <strong>Property visits</strong>
                    <small>
                      {
                        data.appointments.filter(
                          (a) =>
                            !a.completed &&
                            new Date(a.starts_at) >= new Date(data.asOf),
                        ).length
                      }{" "}
                      upcoming personal appointments
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="ll-reminder"
                  onClick={() => {
                    navigate("Tenants");
                  }}
                >
                  <span>
                    <strong>Lease renewals</strong>
                    <small>
                      {stats.expiring.length} leases ending in the next 30 days
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                {reminders.length > 0 && (
                  <button
                    className="ll-reminder"
                    onClick={() => navigate("Calendar")}
                  >
                    <span>
                      <strong>Your next steps</strong>
                      <small>{reminders.length} reminders on your list</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                )}
              </section>
              <LandlordCalendar
                asOf={data.asOf}
                appointments={data.appointments}
                onSelect={selectDay}
              />
            </div>
            <section className="ll-panel ll-portfolio-preview">
              <div className="ll-panel-heading">
                <div>
                  <h2>
                    Your rental properties{" "}
                    <span className="ll-count">{rentals.length}</span>
                  </h2>
                  <p>A clear view of every place you manage.</p>
                </div>
                <div className="ll-inline-actions">
                  <button
                    className="ll-text-button"
                    onClick={() => navigate("Properties")}
                  >
                    View portfolio <ArrowUpRight size={14} />
                  </button>
                  <Button
                    className="ll-button"
                    onClick={() => open("property")}
                    disabled={!canWrite}
                  >
                    <Plus size={14} />
                    Add property
                  </Button>
                </div>
              </div>
              {rentals.length ? (
                <div className="ll-table-scroll">
                  <table className="ll-table">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Tenant</th>
                        <th>Monthly rent</th>
                        <th>Status</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rentals.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="ll-table-property"
                              onClick={() => {
                                navigate("Properties");
                                setDetailId(p.id);
                              }}
                            >
                              <span>
                                <PropertyImage src={p.photo} alt="" />
                              </span>
                              <span>
                                <strong>{p.title}</strong>
                                <small>{p.city}</small>
                              </span>
                            </button>
                          </td>
                          <td>{p.tenant_name || "No tenant assigned"}</td>
                          <td>{money(p.price)}</td>
                          <td>
                            <span className={"ll-status " + p.status}>
                              {labels[p.status]}
                            </span>
                          </td>
                          <td>
                            <button
                              className="ll-icon-button"
                              aria-label={"Edit " + p.title}
                              disabled={!canWrite}
                              onClick={() => open("property", p)}
                            >
                              <Pencil size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ll-small-empty">
                  Add a rental to start managing your portfolio.
                </div>
              )}
            </section>
          </>
        )}
        {view !== "Dashboard" && (
          <div className="ll-section-heading">
            <div>
              <p>YOUR LANDLORD WORKSPACE</p>
              <h2>
                {detail
                  ? detail.title
                  : view === "Analytics"
                    ? "A clearer view of your returns."
                    : view === "Properties"
                      ? "Every property. In one place."
                      : view === "Listings"
                        ? "Rentals on the market, ready to manage."
                      : view === "Tenants"
                        ? "People make a place a home."
                        : view === "Transactions"
                          ? "Keep your numbers in order."
                          : "Make room for what’s next."}
              </h2>
            </div>
            <div className="ll-inline-actions">
              {view === "Transactions" && (
                <button className="ll-button secondary" onClick={exportLedger}>
                  <ArrowDownToLine size={15} />
                  Export
                </button>
              )}
              {view === "Listings" ? (
                <Link className="ll-button secondary" href="/properties?type=for_rent">
                  Browse all rentals <ArrowUpRight size={15} />
                </Link>
              ) : (
                <Button
                  className="ll-button"
                  disabled={
                    !canWrite || (view === "Transactions" && !rentals.length)
                  }
                  onClick={() =>
                    open(
                      view === "Transactions"
                        ? "transaction"
                        : view === "Calendar"
                          ? "appointment"
                          : "property",
                    )
                  }
                >
                  <Plus size={16} />
                  {view === "Transactions"
                    ? "Add transaction"
                    : view === "Calendar"
                      ? "Plan appointment"
                      : "Add property"}
                </Button>
              )}
            </div>
          </div>
        )}
        {view === "Properties" && !detail && (
          <>
            <div className="ll-toolbar">
              <div className="ll-filter-tabs">
                {["all", "active", "rented", "draft", "archived"].map(
                  (status) => (
                    <button
                      className={filter === status ? "active" : ""}
                      key={status}
                      onClick={() => setFilter(status)}
                    >
                      {status === "all" ? "All properties" : labels[status]}
                    </button>
                  ),
                )}
              </div>
              <label className="ll-search">
                <Search size={16} />
                <input
                  placeholder="Search your properties"
                  aria-label="Search your properties"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="ll-property-grid">
              {visibleRentals.map((p) => (
                <article className="ll-panel ll-property-card" key={p.id}>
                  <button
                    className="ll-property-image"
                    aria-label={"View property " + p.title}
                    onClick={() => setDetailId(p.id)}
                  >
                    <PropertyImage key={p.photo} src={p.photo} alt={p.title} />
                    <span className={"ll-status " + p.status}>
                      {labels[p.status]}
                    </span>
                  </button>
                  <div className="ll-property-copy">
                    <div>
                      <h3>{p.title}</h3>
                      <strong>
                        {money(p.price)}
                        <small>/mo</small>
                      </strong>
                    </div>
                    <p>
                      <MapPin size={13} />
                      {p.city}
                    </p>
                    <div className="ll-property-facts">
                      <span>
                        <BedDouble size={14} />
                        {p.beds} beds
                      </span>
                      <span>
                        <Bath size={14} />
                        {p.baths} baths
                      </span>
                      <span>
                        <Maximize size={13} />
                        {p.sqft ? p.sqft.toLocaleString() : "—"} sqft
                      </span>
                    </div>
                    <div className="ll-card-actions">
                      <button
                        className="ll-text-button"
                        onClick={() => setDetailId(p.id)}
                      >
                        View details <ArrowUpRight size={14} />
                      </button>
                      <button
                        className="ll-icon-button"
                        aria-label={"Edit " + p.title}
                        disabled={!canWrite}
                        onClick={() => open("property", p)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="ll-icon-button delete"
                        aria-label={"Delete property " + p.title}
                        disabled={!canWrite}
                        onClick={() => open("delete-property", p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!visibleRentals.length && (
              <div className="ll-empty ll-panel">
                <House size={32} />
                <h3>
                  {query || filter !== "all"
                    ? "No properties match these filters."
                    : "Your rental portfolio starts here."}
                </h3>
                <p>
                  {query || filter !== "all"
                    ? "Try a different search or status."
                    : "Create a property or add the selected marketplace rental as a private draft."}
                </p>
                {!rentals.length && data.suggestedRental && (
                  <Button
                    className="ll-button"
                    onClick={() => importRental()}
                    disabled={pending || !canWrite}
                  >
                    Add selected rental <Plus size={15} />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
        {view === "Listings" && (
          <>
            <div className="ll-toolbar">
              <p className="ll-listing-count">
                {visibleMarket.length} of {data.marketRentals.length} newest
                rentals on SOL
              </p>
              <label className="ll-search">
                <Search size={16} />
                <input
                  placeholder="Search by address or city"
                  aria-label="Search rental listings"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            {visibleMarket.length ? (
              <div className="ll-property-grid">
                {visibleMarket.map((m) => {
                  const imported = importedIds.has(m.id);
                  return (
                    <article className="ll-panel ll-property-card" key={m.id}>
                      <Link
                        className="ll-property-image"
                        href={"/properties/" + m.id}
                        aria-label={"View listing " + m.address}
                      >
                        <PropertyImage key={m.photo} src={m.photo} alt={m.address} />
                        <span className="ll-status active">For rent</span>
                      </Link>
                      <div className="ll-property-copy">
                        <div>
                          <h3>{m.address}</h3>
                          <strong>
                            {m.price ? (
                              <>
                                {money(m.price)}
                                <small>/mo</small>
                              </>
                            ) : (
                              <small>Price on request</small>
                            )}
                          </strong>
                        </div>
                        <p>
                          <MapPin size={13} />
                          {m.city}
                        </p>
                        <div className="ll-property-facts">
                          <span>
                            <BedDouble size={15} />
                            {m.beds ?? "—"} beds
                          </span>
                          <span>
                            <Bath size={15} />
                            {m.baths ?? "—"} baths
                          </span>
                          <span>
                            <Maximize size={14} />
                            {m.sqft ? m.sqft.toLocaleString() : "—"} sqft
                          </span>
                        </div>
                        <div className="ll-card-actions">
                          <Link className="ll-text-button" href={"/properties/" + m.id}>
                            View listing <ArrowUpRight size={14} />
                          </Link>
                          {imported ? (
                            <span className="ll-imported">
                              <Check size={14} /> In your rentals
                            </span>
                          ) : (
                            <button
                              className="ll-import-button"
                              disabled={!canWrite || pending}
                              onClick={() => importRental(m)}
                            >
                              <Plus size={14} /> Add to my rentals
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ll-empty">
                <Building2 size={28} />
                <h3>
                  {data.marketRentals.length
                    ? "No rentals match that search."
                    : "No rentals on the market yet."}
                </h3>
                <p>
                  {data.marketRentals.length
                    ? "Try a different street or city."
                    : "New for-rent listings will appear here as they are imported."}
                </p>
              </div>
            )}
          </>
        )}
        {view === "Properties" && detail && (
          <>
            <button className="ll-back" onClick={() => setDetailId(null)}>
              <ArrowLeft size={15} />
              All rental properties
            </button>
            <div className="ll-detail-grid">
              <section className="ll-panel ll-detail-property">
                <div className="ll-detail-photo">
                  <PropertyImage src={detail.photo} alt={detail.title} />
                </div>
                <div className="ll-detail-copy">
                  <span className={"ll-status " + detail.status}>
                    {labels[detail.status]}
                  </span>
                  <h2>{detail.title}</h2>
                  <p>
                    {detail.address} · {detail.city}
                  </p>
                  <strong>
                    {money(detail.price)}
                    <small> / month</small>
                  </strong>
                  <div className="ll-property-facts">
                    <span>
                      <BedDouble size={15} />
                      {detail.beds} bedrooms
                    </span>
                    <span>
                      <Bath size={15} />
                      {detail.baths} baths
                    </span>
                    <span>
                      <Maximize size={14} />
                      {detail.sqft || "—"} sqft
                    </span>
                  </div>
                  <div className="ll-inline-actions">
                    <button
                      className="ll-button"
                      onClick={() => open("property", detail)}
                      disabled={!canWrite}
                    >
                      <Pencil size={14} />
                      Edit property
                    </button>
                    <button
                      className="ll-button secondary delete"
                      onClick={() => open("delete-property", detail)}
                      disabled={!canWrite}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                    {detail.source_property_id && (
                      <Link
                        className="ll-text-button"
                        href={"/properties/" + detail.source_property_id}
                      >
                        Source listing <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </section>
              <section className="ll-panel ll-lease-detail">
                <div className="ll-panel-heading">
                  <h2>Tenant & lease</h2>
                  <KeyRound size={19} />
                </div>
                <dl>
                  <div>
                    <dt>Tenant</dt>
                    <dd>{detail.tenant_name || "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      {detail.tenant_email ? (
                        <a href={"mailto:" + detail.tenant_email}>
                          {detail.tenant_email}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      {detail.tenant_phone ? (
                        <a href={"tel:" + detail.tenant_phone}>
                          {detail.tenant_phone}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Lease term</dt>
                    <dd>
                      {detail.lease_start || "Not set"} →{" "}
                      {detail.lease_end || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt>Property notes</dt>
                    <dd>{detail.notes || "No notes yet."}</dd>
                  </div>
                </dl>
                <div className="ll-property-summary">
                  {(() => {
                    const own = rentalSummary(
                      [detail],
                      data.transactions.filter(
                        (t) => t.property_id === detail.id,
                      ),
                      data.asOf,
                    );
                    return (
                      <>
                        <div>
                          <span>Received this month</span>
                          <strong>{money(own.income)}</strong>
                        </div>
                        <div>
                          <span>Expenses this month</span>
                          <strong>{money(own.expenses)}</strong>
                        </div>
                        <div>
                          <span>Net this month</span>
                          <strong>{money(own.net)}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </section>
            </div>
            <section className="ll-panel">
              <div className="ll-panel-heading">
                <h2>Property ledger</h2>
                <Button
                  className="ll-button"
                  onClick={() => open("transaction", detail)}
                  disabled={!canWrite}
                >
                  <Plus size={14} />
                  Record transaction
                </Button>
              </div>
              {ledger(
                data.transactions
                  .filter((t) => t.property_id === detail.id)
                  .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)),
              )}
            </section>
          </>
        )}
        {view === "Tenants" && (
          <div className="ll-tenant-grid">
            {tenants.map((p, i) => (
              <article className="ll-panel ll-tenant-card" key={p.id}>
                <div>
                  <span className={"ll-contact-avatar tone-" + (i % 3)}>
                    {p.tenant_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className={"ll-status " + p.status}>
                    {labels[p.status]}
                  </span>
                </div>
                <h3>{p.tenant_name}</h3>
                <p>{p.title}</p>
                <dl>
                  <div>
                    <dt>Monthly rent</dt>
                    <dd>{money(p.price)}</dd>
                  </div>
                  <div>
                    <dt>Lease ends</dt>
                    <dd>{p.lease_end || "Not set"}</dd>
                  </div>
                </dl>
                <div className="ll-tenant-contact-links">
                  {p.tenant_email && (
                    <a href={"mailto:" + p.tenant_email}>
                      <Mail size={15} />
                      Email
                    </a>
                  )}
                  {p.tenant_phone && (
                    <a href={"tel:" + p.tenant_phone}>
                      <Phone size={15} />
                      Call
                    </a>
                  )}
                  <button
                    className="ll-text-button"
                    onClick={() => open("property", p)}
                    disabled={!canWrite}
                  >
                    Edit lease <Pencil size={14} />
                  </button>
                </div>
              </article>
            ))}
            {!tenants.length && (
              <div className="ll-panel ll-empty">
                <KeyRound size={30} />
                <h3>Your tenants, thoughtfully organized.</h3>
                <p>Add tenant details when editing a rental property.</p>
              </div>
            )}
          </div>
        )}
        {view === "Transactions" && (
          <section className="ll-panel">
            <div className="ll-toolbar">
              <div className="ll-filter-tabs">
                {["all", "paid", "pending", "rent", "expense"].map((value) => (
                  <button
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {value === "all"
                      ? "All records"
                      : value === "rent"
                        ? "Income"
                        : value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
              <label className="ll-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search transactions"
                  aria-label="Search transactions"
                />
              </label>
            </div>
            {ledger()}
            <p className="ll-ledger-note">
              Your recorded payments and expenses. This ledger does not collect
              rent or move money.
            </p>
          </section>
        )}
        {view === "Analytics" && (
          <>
            <div className="ll-analytics-grid">
              {performance()}
              <section className="ll-panel ll-income-summary">
                <div className="ll-panel-heading">
                  <h2>Your rental snapshot</h2>
                  <CircleDollarSign size={19} />
                </div>
                <div>
                  <p>Scheduled monthly rent</p>
                  <strong>{money(stats.scheduled)}</strong>
                  <small>Sum of monthly rent for occupied properties</small>
                </div>
                <dl>
                  <div>
                    <dt>Recorded rent this month</dt>
                    <dd>{money(stats.income)}</dd>
                  </div>
                  <div>
                    <dt>Recorded expenses</dt>
                    <dd>−{money(stats.expenses)}</dd>
                  </div>
                  <div>
                    <dt>Net rental income</dt>
                    <dd>{money(stats.net)}</dd>
                  </div>
                  <div>
                    <dt>Outstanding overdue rent</dt>
                    <dd>
                      {money(
                        stats.overdue.reduce((sum, t) => sum + t.amount, 0),
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
            <section className="ll-panel">
              <div className="ll-panel-heading">
                <h2>Performance by property</h2>
                <span className="ll-muted">This calendar month</span>
              </div>
              <div className="ll-table-scroll">
                <table className="ll-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Scheduled rent</th>
                      <th>Received</th>
                      <th>Expenses</th>
                      <th>Net income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentals.map((p) => {
                      const own = rentalSummary(
                        [p],
                        data.transactions.filter((t) => t.property_id === p.id),
                        data.asOf,
                      );
                      return (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="ll-text-button"
                              onClick={() => {
                                navigate("Properties");
                                setDetailId(p.id);
                              }}
                            >
                              {p.title}
                              <ArrowUpRight size={12} />
                            </button>
                          </td>
                          <td>{money(own.scheduled)}</td>
                          <td>{money(own.income)}</td>
                          <td>{money(own.expenses)}</td>
                          <td className="ll-positive">{money(own.net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="ll-ledger-note">
                Income reflects paid ledger entries, not bank-verified receipts.
                Occupancy includes available and occupied properties; drafts and
                archived properties are excluded.
              </p>
            </section>
          </>
        )}
        {view === "Calendar" && (
          <div className="ll-calendar-page">
            <LandlordCalendar
              asOf={data.asOf}
              appointments={data.appointments}
              onSelect={selectDay}
            />
            <section className="ll-panel">
              <div className="ll-panel-heading">
                <h2>Your appointments</h2>
                <CalendarDays size={19} />
              </div>
              {data.appointments.length ? (
                [...data.appointments]
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .map((a) => (
                    <div className="ll-appointment" key={a.id}>
                      <span className="ll-appointment-date">
                        {new Date(a.starts_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "Asia/Singapore",
                        })}
                      </span>
                      <div>
                        <strong className={a.completed ? "completed" : ""}>
                          {a.title}
                        </strong>
                        <p>{a.location || "Location to be confirmed"}</p>
                        <small>
                          <Clock3 size={12} />
                          {new Date(a.starts_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "Asia/Singapore",
                          })}{" "}
                          SGT
                        </small>
                      </div>
                      <label>
                        <input
                          type="checkbox"
                          checked={a.completed}
                          disabled={pending || !data.ready}
                          onChange={() =>
                            execute(
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
                              "Appointment updated.",
                              true,
                            )
                          }
                        />
                        <span className="sr-only">Complete {a.title}</span>
                      </label>
                    </div>
                  ))
              ) : (
                <div className="ll-small-empty">
                  Select a date to plan an inspection or viewing.
                </div>
              )}
            </section>
            <section className="ll-panel ll-reminder-list">
              <div className="ll-panel-heading">
                <h2>Your reminders</h2>
                <button
                  className="ll-icon-button"
                  aria-label="Add reminder"
                  onClick={() => open("task")}
                  disabled={!data.ready}
                >
                  <Plus size={18} />
                </button>
              </div>
              {data.tasks.map((task) => (
                <label key={task.id}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={pending || !data.ready}
                    onChange={() =>
                      execute(
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
                        "Reminder updated.",
                        true,
                      )
                    }
                  />
                  <span className={task.completed ? "completed" : ""}>
                    {task.title}
                  </span>
                </label>
              ))}
              {!data.tasks.length && (
                <p className="ll-small-empty">
                  A fresh start. Add your first reminder.
                </p>
              )}
            </section>
          </div>
        )}
        <footer className="ll-footer">
          <span>
            <Sun size={14} />
            SOL · A little clarity. A better rental experience.
          </span>
          <span>
            {data.demo
              ? "Preview · no changes are saved to an account"
              : "Private landlord workspace"}
            <span>USD</span>
          </span>
        </footer>
        <LandlordDialog
          modal={modal}
          close={close}
          rental={editing}
          transaction={editingTransaction}
          properties={rentals}
          date={date}
          pending={pending}
          error={error}
          onSubmit={submit}
          demo={data.demo}
        />
        </div>
      </div>
    </div>
  );
}
