import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sun, ArrowLeft, Building2, Heart, KeyRound } from "lucide-react";
import { signIn, signUp } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const ROLE_OPTIONS = [
  { value: "buyer", title: "Buy a home", description: "Save homes, plan viewings, track offers", icon: Heart },
  { value: "seller", title: "Sell a property", description: "List your property and manage offers", icon: Building2 },
  { value: "landlord", title: "Rent out a property", description: "Manage rentals, tenants, and rent", icon: KeyRound },
] as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const isSignup = get("mode") === "signup";
  const error = get("error");
  const message = get("message");

  return (
    <div className="auth-shell">
      <div className="auth-art"><Image src="/images/hero-villa.jpg" alt="An inspiring place to begin your next chapter" fill sizes="50vw" priority /><div /><p><Sun size={32} />Your next chapter.<br />All in one place.</p></div>
      <div className="auth-content">
      <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to SOL</Link>
      <p className="eyebrow">A LITTLE CLOSER TO HOME</p>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">
        {isSignup ? "Make yourself at home." : "Welcome home."}
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{isSignup ? "Tell us how you'll use SOL and we'll set up the right workspace for you." : "Sign in to pick up where you left off."}</p>

      {error && <p className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary">{message}</p>}

      <form action={isSignup ? signUp : signIn} className="space-y-4">
        <input type="hidden" name="next" value={get("next") ?? ""} />
        {isSignup && (
          <fieldset className="role-picker">
            <legend className="label">I&apos;m here to</legend>
            {ROLE_OPTIONS.map((r) => (
              <label key={r.value} className="role-option-card">
                <input type="radio" name="role" value={r.value} required defaultChecked={get("role") === r.value} />
                <span className={`role-option-icon role-${r.value}`}>
                  <r.icon size={18} />
                </span>
                <span className="role-option-text">
                  <strong>{r.title}</strong>
                  <small>{r.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {isSignup && (
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input className="input" id="fullName" name="fullName" required autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        <button className="btn w-full">{isSignup ? "Create account" : "Sign in"}</button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>Already a member? <Link className="text-primary" href="/login">Sign in</Link></>
        ) : (
          <>New here? <Link className="text-primary" href="/login?mode=signup">Create an account</Link></>
        )}
      </p>
      </div>
    </div>
  );
}
