"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertiesError({ reset }: { reset: () => void }) {
  return <div className="section-shell py-16"><div className="listing-empty"><Search size={30} /><h2>Let’s try that again.</h2><p>We couldn’t reach the listing service. Your next home is worth another look.</p><Button onClick={reset} className="px-5 py-6">Try again</Button></div></div>;
}
