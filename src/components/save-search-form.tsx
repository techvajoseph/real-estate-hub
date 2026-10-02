"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSearch, type SaveSearchState } from "@/app/properties/actions";

export function SaveSearchForm({ filters }: { filters: string }) {
  const [state, action, pending] = useActionState<SaveSearchState, FormData>(saveSearch, { status: "idle" });

  return (
    <div className="flex flex-col items-end gap-1">
      {/* key resets the input after each successful save */}
      <form action={action} className="flex gap-2" key={state.status === "saved" ? state.name : "form"}>
        <input type="hidden" name="filters" value={filters} />
        <label htmlFor="save-search-name" className="sr-only">Name this search</label>
        <input
          id="save-search-name"
          className="input w-48"
          name="name"
          placeholder="Name this search"
          maxLength={100}
          required
          disabled={pending}
        />
        <button className="btn-outline" disabled={pending}>
          {pending ? "Saving…" : "Save search"}
        </button>
      </form>
      <p aria-live="polite" className="min-h-5 text-sm">
        {state.status === "saved" && (
          <span className="text-primary">
            Saved “{state.name}” ✓ <Link href="/dashboard" className="underline">View in dashboard</Link>
          </span>
        )}
        {state.status === "error" && <span className="text-destructive">{state.message}</span>}
      </p>
    </div>
  );
}
