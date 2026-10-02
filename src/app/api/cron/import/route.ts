import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { CREDITS_PER_LISTING_REQUEST } from "@/lib/hasdata/client";
import { runAllImportSources } from "@/lib/hasdata/ingest";

export const maxDuration = 300;

function authorized(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${serverEnv().CRON_SECRET}`;
  return (
    header.length === expected.length &&
    timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  );
}

/** GET /api/cron/import — Vercel Cron re-runs every active import source, then enriches new listings. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { results, details } = await runAllImportSources();
  return NextResponse.json({
    sources: results.length,
    failed: results.filter((r) => r.status === "failed").length,
    details,
    creditsUsed:
      results.reduce((sum, r) => sum + r.creditsUsed, 0) +
      details.fetched * CREDITS_PER_LISTING_REQUEST,
    results,
  });
}
