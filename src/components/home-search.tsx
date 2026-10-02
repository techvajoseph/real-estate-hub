"use client";

import { Tabs } from "@base-ui/react/tabs";
import { MapPin, Search, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Underline composition informed by Origin UI's public 21st.dev Tabs pattern.
// Base UI supplies roving focus, keyboard navigation, and linked tab panels.
export function HomeSearch() {
  return (
    <Tabs.Root defaultValue="for_sale" className="home-search">
      <Tabs.List className="search-tabs" aria-label="Find your next home">
        <Tabs.Tab value="for_sale">Buy a home</Tabs.Tab>
        <Tabs.Tab value="for_rent">Rent a home</Tabs.Tab>
        <Tabs.Tab value="explore">Explore</Tabs.Tab>
      </Tabs.List>
      {["for_sale", "for_rent"].map((type) => (
        <Tabs.Panel key={type} value={type} className="search-panel">
          <form action="/properties" method="get" className="hero-search-form">
            <input type="hidden" name="type" value={type} />
            <MapPin size={22} aria-hidden="true" />
            <label className="sr-only" htmlFor={`location-${type}`}>City, neighborhood, address, or ZIP code</label>
            <input id={`location-${type}`} name="q" placeholder="City, neighborhood, or ZIP code" />
            <Button type="submit" className="search-submit"><Search size={19} /><span>Search homes</span></Button>
          </form>
        </Tabs.Panel>
      ))}
      <Tabs.Panel value="explore" className="search-panel explore-panel"><span>Find a place that feels like you.</span><Link href="#neighborhoods" className="btn">Explore neighborhoods <ArrowUpRight size={18} /></Link></Tabs.Panel>
    </Tabs.Root>
  );
}
