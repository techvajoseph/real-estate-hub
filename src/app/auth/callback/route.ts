import { NextResponse, type NextRequest } from "next/server";
import { SIGNUP_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Same-site relative paths only, so the callback can't be used as an open redirect. */
const safeNext = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

/** Google (OAuth) sign-in lands here: exchange the code for a session, then continue. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?${new URLSearchParams({ error: message })}`);

  // User cancelled on Google's screen, or Google/Supabase rejected the request.
  if (searchParams.get("error")) {
    return fail(
      searchParams.get("error") === "access_denied"
        ? "Google sign-in was cancelled."
        : "Google sign-in didn't complete. Please try again.",
    );
  }

  const code = searchParams.get("code");
  if (!code) return fail("Google sign-in didn't complete. Please try again.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("That sign-in link expired. Please try again.");

  // New Google sign-up with a chosen workspace: create it once. Existing users keep theirs.
  const role = searchParams.get("role");
  if (role && (SIGNUP_ROLES as readonly string[]).includes(role)) {
    const { data: existing } = await supabase
      .from("workspaces")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!existing) await supabase.from("workspaces").insert({ user_id: data.user.id, role });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
