import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const SIGNUP_ROLES = ["buyer", "seller", "landlord"] as const;

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const chosen = user.user_metadata?.workspace_role;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? null,
    role: (profile?.role ?? "member") as "member" | "agent" | "admin",
    /** Workspace chosen on the sign-up form (Buyer / Seller / Landlord), if any. */
    signupRole: SIGNUP_ROLES.includes(chosen) ? (chosen as (typeof SIGNUP_ROLES)[number]) : null,
  };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
