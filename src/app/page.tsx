import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Compass, Heart, House, MapPin, Search, ShieldCheck, Sun } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { HomeSearch } from "@/components/home-search";
import { searchProperties } from "@/lib/properties";

const places = [
  { title: "The city is calling.", subtitle: "Energy. Culture. Connection.", image: "/images/new-york.jpg", query: "New York", label: "CITY LIVING" },
  { title: "Room to grow.", subtitle: "A little more space. A lot more possibility.", image: "/images/modern-home.jpg", query: "Los Angeles", label: "A FRESH PERSPECTIVE" },
  { title: "Your kind of calm.", subtitle: "Slow mornings start here.", image: "/images/interior.jpg", query: "Miami", label: "EVERYDAY ESCAPES" },
];

export default async function HomePage() {
  let result: Awaited<ReturnType<typeof searchProperties>> | null = null;
  try { result = await searchProperties({ sort: "newest", page: 1, type: "for_sale" }); } catch { /* Show an honest retry state if the listing service is unavailable. */ }
  const properties = result?.properties ?? [];
  return (
    <div className="sol-home">
      <section className="hero" aria-labelledby="hero-title">
        <Image src="/images/hero-villa.jpg" alt="Modern architectural home with a sunlit garden and swimming pool" fill priority sizes="100vw" className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="hero-eyebrow"><span /> A NEW WAY TO COME HOME</p>
          <h1 id="hero-title">Extraordinary homes.<br />Your next chapter.</h1>
          <p className="hero-description">More than a place to live. A place to belong.<br />Discover a home that feels unmistakably you.</p>
          <HomeSearch />
          <div className="trending"><span>Popular searches</span>{["Los Angeles", "New York", "Miami"].map(city => <Link key={city} href={`/properties?q=${encodeURIComponent(city)}&type=for_sale`}>{city}<ArrowUpRight size={12} /></Link>)}</div>
        </div>
        <div className="hero-bottom"><span><MapPin size={14} /> Inspired spaces. Endless possibilities.</span><a href="#discover" aria-label="Discover homes below"><ArrowDown size={18} /></a><span className="hero-editorial">THE ART OF LIVING WELL <span>EST. 2026</span></span></div>
      </section>

      <div className="trust-strip">
        <p>A better home search.<br /><strong>From the very first click.</strong></p>
        <div><House /><span><strong>Homes for every chapter</strong><small>Buy, rent, and find your place</small></span></div>
        <div><ShieldCheck /><span><strong>Clarity at every step</strong><small>Property details, all in one place</small></span></div>
        <div><Heart /><span><strong>A search that stays with you</strong><small>Save the homes you love</small></span></div>
      </div>

      <section className="section-shell featured-section" id="discover">
        <div className="section-heading"><div><p className="eyebrow">GOOD PLACES. GREAT POSSIBILITIES.</p><h2>A place to call your own.</h2><p>Fresh on the market. Ready for your next chapter.</p></div><Link href="/properties?type=for_sale" className="text-link">Explore all homes <ArrowUpRight size={19} /></Link></div>
        <div className="collection-bar"><div className="collection-links"><Link className="selected" href="/#discover">Latest homes</Link><Link href="/properties?type=for_rent">For rent</Link><Link href="/properties?minPrice=1000000&type=for_sale">Luxury collection <ArrowUpRight size={13} /></Link></div><span>{result ? `${result.total.toLocaleString()} homes to explore` : "Your next chapter starts here"}</span></div>
        {properties.length > 0 ? <div className="featured-grid">{properties.slice(0, 3).map(p => <PropertyCard key={p.id} property={p} />)}</div> : <div className="listing-empty"><Search size={30} /><h3>{result ? "Your next home is on the horizon." : "We couldn’t load the latest homes."}</h3><p>{result ? "Explore available listings or come back for new arrivals." : "Please try again in a moment."}</p><Link href="/properties" className="btn">Browse homes <ArrowRight size={17} /></Link></div>}
        <p className="listing-note"><Check size={13} /> Real listings. Clear details. A little closer to home.</p>
      </section>

      <section className="neighborhood-section" id="neighborhoods"><div className="section-shell">
        <div className="section-heading"><div><p className="eyebrow">FIND YOUR EVERYDAY EXTRAORDINARY</p><h2>Love where you live.</h2><p>The right home starts with the right surroundings.</p></div><Link href="/properties" className="text-link">Find your neighborhood <ArrowUpRight size={19} /></Link></div>
        <div className="neighborhood-grid">{places.map(place => <Link href={`/properties?q=${encodeURIComponent(place.query)}`} className="neighborhood-card" key={place.title}><Image src={place.image} alt={place.subtitle} fill sizes="(max-width: 700px) 100vw, 33vw" /><div className="neighborhood-shade" /><span className="neighborhood-label">{place.label}</span><div className="neighborhood-copy"><h3>{place.title}</h3><p>{place.subtitle}</p><span>Explore {place.query} <ArrowUpRight size={17} /></span></div></Link>)}</div>
      </div></section>

      <section className="section-shell why-section" id="why-sol"><div className="why-image"><Image src="/images/interior.jpg" alt="Warm, light-filled living room opening onto a green courtyard" fill sizes="(max-width: 800px) 100vw, 50vw" /><div className="image-caption"><Sun size={27} /><span>Less searching.<br /><strong>More living.</strong></span></div></div><div className="why-copy"><p className="eyebrow">A LITTLE GUIDANCE. A LOT OF POSSIBILITY.</p><h2>A big move.<br />A better experience.</h2><p>Finding home should feel exciting. We bring the details together, so you can focus on what matters: the life you want to build.</p><div className="why-point"><Compass /><div><h3>Explore with confidence</h3><p>Compare prices, spaces, and the details that make a home yours.</p></div></div><div className="why-point"><Heart /><div><h3>Keep your favorites close</h3><p>Save your shortlist and your searches. Pick up right where you left off.</p></div></div><Link href="/properties" className="btn">Let’s find your home <ArrowUpRight size={17} /></Link></div></section>

      <section className="home-cta"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>Somewhere, your home is waiting.</h2><p>Let’s help you find it.</p></div><Link href="/properties" className="cta-button">Explore homes <ArrowUpRight size={19} /></Link></section>
      <footer className="site-footer"><div className="footer-top"><Link href="/" className="brand"><Sun strokeWidth={1.5} /><span>SOL<span className="brand-dot">.</span></span><span className="brand-caption">REAL ESTATE</span></Link><p>A place for your next chapter.</p><div><Link href="/properties?type=for_sale">Buy</Link><Link href="/properties?type=for_rent">Rent</Link><Link href="/dashboard">Saved homes</Link><a href="#why-sol">About SOL</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SOL Real Estate. All rights reserved.</span><span><House size={14} /> Equal housing opportunity</span><span>Made for the way you want to live.</span></div><p className="footer-disclaimer">Listing information is provided by third-party sources and is subject to change. Confirm availability and property details with the listing provider. Editorial photography is for inspiration.</p></footer>
    </div>
  );
}
