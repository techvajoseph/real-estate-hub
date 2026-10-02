"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
    .extend({ fullName: z.string().trim().min(1, "Name is required") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) loginRedirect({ error: parsed.error.issues[0].message, mode: "signup" });

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });
  if (error) loginRedirect({ error: authErrorMessage(error), mode: "signup" });

  loginRedirect({ message: "Check your email to confirm your account." });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
