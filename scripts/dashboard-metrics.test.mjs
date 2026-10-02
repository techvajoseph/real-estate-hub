import test from "node:test";
import assert from "node:assert/strict";
import { summarize, monthlyActivity } from "../src/lib/dashboard/types.ts";
const base = {
  asOf: "2026-10-02T00:00:00Z",
  name: "Test",
  email: "test@example.com",
  role: "seller",
  ready: true,
  demo: false,
  listings: [],
  deals: [],
  appointments: [],
  tasks: [],
  homes: [],
  searches: [],
};
test("sale pipeline never mixes monthly rent with sale prices", () => {
  const result = summarize({
    ...base,
    deals: [
      { stage: "offer", kind: "sale", amount: 500000 },
      { stage: "lead", kind: "rent", amount: 2500 },
      { stage: "closed", kind: "sale", amount: 700000 },
      { stage: "closed", kind: "rent", amount: 3000 },
      { stage: "lost", kind: "sale", amount: 900000 },
    ],
  });
  assert.equal(result.pipeline, 500000);
  assert.equal(result.openDeals, 2);
  assert.equal(result.sales, 700000);
  assert.equal(result.closed, 1);
});
test("occupancy excludes archived and draft rentals; scheduled rent includes only rented units", () => {
  const result = summarize({
    ...base,
    listings: [
      { kind: "rent", status: "rented", price: 3000 },
      { kind: "rent", status: "active", price: 2000 },
      { kind: "rent", status: "draft", price: 4000 },
      { kind: "rent", status: "archived", price: 5000 },
      { kind: "sale", status: "active", price: 700000 },
    ],
  });
  assert.equal(result.rentalCount, 2);
  assert.equal(result.occupancy, 50);
  assert.equal(result.monthlyRent, 3000);
});
test("empty workspaces produce zero metrics, never NaN", () => {
  const result = summarize(base);
  for (const value of Object.values(result)) assert.equal(value, 0);
});
test("monthly chart uses actual close dates across year boundaries", () => {
  const chart = monthlyActivity(
    [
      {
        created_at: "2025-12-20T10:00:00Z",
        stage: "closed",
        closed_at: "2026-01-02T10:00:00Z",
      },
      { created_at: "2025-11-03T10:00:00Z", stage: "offer", closed_at: null },
    ],
    3,
    new Date("2026-01-15T00:00:00Z"),
  );
  assert.deepEqual(chart, [
    { label: "Nov", opened: 1, closed: 0 },
    { label: "Dec", opened: 1, closed: 0 },
    { label: "Jan", opened: 0, closed: 1 },
  ]);
});
