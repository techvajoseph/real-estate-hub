"use client";

import Link from "next/link";
import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  Heart,
  KeyRound,
  LogOut,
  Settings2,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import type { WorkspaceRole } from "@/lib/dashboard/types";

export const WORKSPACES: Record<
  WorkspaceRole,
  { label: string; description: string; icon: typeof Heart }
> = {
  buyer: {
    label: "Buyer",
    description: "Saved homes, searches, viewings, and offers",
    icon: Heart,
  },
  seller: {
    label: "Seller",
    description: "Your listings, sale offers, and analytics",
    icon: Building2,
  },
  landlord: {
    label: "Landlord",
    description: "Rentals, tenants, rent ledger, and occupancy",
    icon: KeyRound,
  },
};

type Props = {
  name: string;
  email: string;
  role: WorkspaceRole;
  pending: boolean;
  /** Preview pages have no account to sign out of. */
  demo: boolean;
  onSwitch: (role: WorkspaceRole) => void;
  /** Omitted where the workspace has no settings view. */
  onSettings?: () => void;
};

/** Avatar button that opens the account menu: switch between the three workspaces, settings, sign out. */
export function AccountMenu({ name, email, role, pending, demo, onSwitch, onSettings }: Props) {
  const [open, setOpen] = useState(false);
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="dash-avatar account-trigger"
        aria-label={`Account menu: ${WORKSPACES[role].label} workspace`}
      >
        {initials}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end" className="account-positioner">
          <Popover.Popup className="account-menu">
            <div className="account-menu-head">
              <span className="dash-avatar">{initials}</span>
              <div>
                <strong>{name}</strong>
                {email && <span>{email}</span>}
              </div>
            </div>
            <p className="account-menu-caption">Switch workspace</p>
            <RoleOptions
              role={role}
              pending={pending}
              onPick={(r) => {
                setOpen(false);
                if (r !== role) onSwitch(r);
              }}
            />
            <div className="account-menu-links">
              {onSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSettings();
                  }}
                >
                  <Settings2 size={16} /> Workspace settings
                </button>
              )}
              <Link href="/properties">
                <ArrowUpRight size={16} /> Marketplace
              </Link>
              {demo ? (
                <Link href="/dashboard">
                  <ArrowUpRight size={16} /> Open my workspace
                </Link>
              ) : (
                <form action={signOut}>
                  <button type="submit">
                    <LogOut size={16} /> Sign out
                  </button>
                </form>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The three workspaces as selectable options. Shared by the account menu and the sidebar selector. */
function RoleOptions({
  role,
  pending,
  onPick,
}: {
  role: WorkspaceRole;
  pending: boolean;
  onPick: (role: WorkspaceRole) => void;
}) {
  return (
    <div className="account-menu-roles" role="group" aria-label="Workspace">
      {(Object.keys(WORKSPACES) as WorkspaceRole[]).map((r) => {
        const w = WORKSPACES[r];
        const current = r === role;
        return (
          <button
            key={r}
            type="button"
            className={current ? "is-current" : undefined}
            aria-pressed={current}
            disabled={pending}
            onClick={() => onPick(r)}
          >
            <span className={`account-role-icon role-${r}`}>
              <w.icon size={17} />
            </span>
            <span>
              <strong>{w.label}</strong>
              <small>{w.description}</small>
            </span>
            {current && <Check size={16} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

/** Sidebar "My workspace" card. Opens the same switch list as the avatar menu. */
export function WorkspaceSelector({
  role,
  pending,
  onSwitch,
}: {
  role: WorkspaceRole;
  pending: boolean;
  onSwitch: (role: WorkspaceRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = WORKSPACES[role].icon;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="workspace-selector"
        aria-label={`My workspace: ${WORKSPACES[role].label}. Switch workspace`}
      >
        <span className={`workspace-icon account-role-icon role-${role}`}>
          <Icon size={20} />
        </span>
        <span className="workspace-selector-copy">
          <strong>My workspace</strong>
          <span>{WORKSPACES[role].label} workspace</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="account-positioner">
          <Popover.Popup className="account-menu workspace-menu">
            <p className="account-menu-caption">Switch workspace</p>
            <RoleOptions
              role={role}
              pending={pending}
              onPick={(r) => {
                setOpen(false);
                if (r !== role) onSwitch(r);
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
