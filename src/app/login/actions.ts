"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SIGNUP_ROLES } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  next: z.string().optional(),
});

/** Only allow same-site relative redirects. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/** Turns Supabase Auth error codes into messages a member can act on. */
function authErrorMessage(error: { code?: string; message: string }) {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return "Too many sign-up emails were sent recently. Please try again in a little while.";
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox for the confirmation link.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "user_already_exists":
      return "An account with this email already exists. Try signing in.";
    default:
      return error.message;
  }
}

function loginRedirect(params: Record<string, string>): never {
  redirect(`/login?${new URLSearchParams(params)}`);
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) loginRedirect({ error: parsed.error.issues[0].message });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) loginRedirect({ error: authErrorMessage(error), next: parsed.data.next ?? "" });

  redirect(safeNext(parsed.data.next));
}

export async function signUp(formData: FormData) {
  const parsed = credentialsSchema
    .extend({
      fullName: z.string().trim().min(1, "Name is required"),
      role: z.enum(SIGNUP_ROLES, { error: "Choose whether you're a buyer, seller, or landlord." }),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const role = formData.get("role");
    loginRedirect({
      error: parsed.error.issues[0].message,
      mode: "signup",
      ...(typeof role === "string" && role ? { role } : {}),
    });
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, workspace_role: parsed.data.role },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });
  if (error) loginRedirect({ error: authErrorMessage(error), mode: "signup", role: parsed.data.role });

  // Email confirmation off: already signed in, so set up the workspace and go straight in.
  if (data.session) {
    await supabase.from("workspaces").upsert({ user_id: data.session.user.id, role: parsed.data.role });
    redirect("/dashboard");
  }
  loginRedirect({ message: "Check your email to confirm your account." });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Absolute origin of this request (works locally, on Vercel, and behind proxies). */
async function requestOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * signInWithOAuth only builds a URL, so a disabled provider would otherwise show
 * Supabase's raw JSON error page. Ask Supabase's public settings first (cached 60s).
 */
async function googleEnabled() {
  try {
    const res = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      next: { revalidate: 60 },
    });
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return true; // Settings unreachable: let Supabase report any real problem.
  }
}

/**
 * "Continue with Google": sends the browser to Google via Supabase.
 * On sign-up the chosen workspace rides along so /auth/callback can set it up.
 */
export async function signInWithGoogle(formData: FormData) {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const next = safeNext(String(formData.get("next") ?? "") || undefined);
  const role = z.enum(SIGNUP_ROLES).safeParse(formData.get("role"));
  if (mode === "signup" && !role.success) {
    loginRedirect({ error: "Choose whether you're a buyer, seller, or landlord first.", mode: "signup" });
  }

  if (!(await googleEnabled())) {
    loginRedirect({
      error: "Google sign-in isn't switched on yet. Please use email for now.",
      ...(mode === "signup" ? { mode } : {}),
    });
  }

  const callback = new URL("/auth/callback", await requestOrigin());
  callback.searchParams.set("next", next);
  if (role.success) callback.searchParams.set("role", role.data);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      // Always show the account chooser, so people with several Google accounts can pick.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    loginRedirect({
      error: "We couldn't reach Google. Please try again.",
      ...(mode === "signup" ? { mode } : {}),
    });
  }
  redirect(data.url);
}
