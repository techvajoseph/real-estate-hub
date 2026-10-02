import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runImport } from "@/lib/hasdata/ingest";
import { importRequestSchema } from "@/lib/hasdata/schema";

export const maxDuration = 300;

/** POST /api/admin/import — admin-triggered one-off HasData import. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = importRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await runImport({ ...parsed.data, triggeredBy: user.id });
  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
}
