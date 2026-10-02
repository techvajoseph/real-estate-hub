"use client";

import { useState } from "react";
import { House } from "lucide-react";

export function PropertyImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="photo-placeholder"><House size={40} /><span>{failed ? "Photo temporarily unavailable" : "Photos coming soon"}</span></div>;
  // Property photos originate from multiple independent listing CDNs.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
