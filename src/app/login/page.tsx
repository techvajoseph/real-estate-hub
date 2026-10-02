import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sun, ArrowLeft } from "lucide-react";
import { signIn, signUp } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

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
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{isSignup ? "Create an account to save your favorite homes and searches." : "Sign in to pick up where you left off."}</p>

      {error && <p className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary">{message}</p>}

      <form action={isSignup ? signUp : signIn} className="space-y-4">
        <input type="hidden" name="next" value={get("next") ?? ""} />
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
