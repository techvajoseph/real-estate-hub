import Link from "next/link";
import { ArrowUpRight, Heart, Menu, Sun } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="SOL Real Estate home"><Sun strokeWidth={1.5} /><span>SOL<span className="brand-dot">.</span></span><span className="brand-caption">REAL ESTATE</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/properties?type=for_sale">Buy a home</Link>
        <Link href="/properties?type=for_rent">Rent a home</Link>
        <Link href="/#neighborhoods">Explore neighborhoods</Link>
        <Link href="/#why-sol">Why SOL</Link>
        {user?.role === "admin" && <Link href="/admin/import">Import</Link>}
      </nav>
      <div className="header-actions">
        <Link href="/dashboard" className="saved-link"><Heart size={18} /><span>Saved homes</span></Link>
        {user ? <form action={signOut}><button className="btn header-signin">Sign out</button></form> : <Link href="/login" className="btn header-signin">Sign in <ArrowUpRight size={16} /></Link>}
        <details className="mobile-menu"><summary aria-label="Open navigation"><Menu size={23} /></summary><nav aria-label="Mobile navigation"><Link href="/properties?type=for_sale">Buy a home</Link><Link href="/properties?type=for_rent">Rent a home</Link><Link href="/#neighborhoods">Neighborhoods</Link><Link href="/#why-sol">Why SOL</Link><Link href="/dashboard">Saved homes</Link></nav></details>
      </div>
    </header>
  );
}
