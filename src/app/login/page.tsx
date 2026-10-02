import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sun, ArrowLeft, Building2, Heart, KeyRound } from "lucide-react";
import { signIn, signInWithGoogle, signUp } from "./actions";

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
        <input type="hidden" name="mode" value={isSignup ? "signup" : "signin"} />
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
        <button
          type="submit"
          formAction={signInWithGoogle}
          formNoValidate
          className="google-button"
        >
          <GoogleLogo />
          Continue with Google
        </button>
        <p className="auth-divider"><span>or {isSignup ? "sign up" : "sign in"} with email</span></p>
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

/** Google "G" mark (official colours), inline so there is no external request. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
