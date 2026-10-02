"use client";

/* eslint-disable @next/next/no-img-element -- scraped photos come from many CDNs */

import { useCallback, useEffect, useState } from "react";
import { photoUrl } from "@/lib/photos";

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) =>
      setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (photos.length === 0) {
    return <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-border text-muted-foreground">No photos</div>;
  }

  const preview = photos.slice(1, 5);

  return (
    <>
      <div className="grid gap-2 md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="relative aspect-[4/3] overflow-hidden rounded-lg md:col-span-2 md:row-span-2 md:aspect-auto"
        >
          <img src={photoUrl(photos[0], "large")} alt={alt} className="h-full w-full object-cover" />
        </button>
        {preview.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i + 1)}
            className="relative hidden aspect-[4/3] overflow-hidden rounded-lg md:block"
          >
            <img src={photoUrl(src, "card")} alt="" loading="lazy" className="h-full w-full object-cover" />
            {i === preview.length - 1 && photos.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-medium text-white">
                +{photos.length - 5} photos
              </span>
            )}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(0)} className="btn-outline mt-2 md:hidden">
        View all {photos.length} photos
      </button>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setOpen(null)}
        >
          <div className="flex items-center justify-between p-4 text-sm text-white">
            <span>{open + 1} / {photos.length}</span>
            <button type="button" className="rounded px-3 py-1 hover:bg-white/10" onClick={() => setOpen(null)}>
              Close ✕
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-12 pb-6" onClick={(e) => e.stopPropagation()}>
            <img src={photoUrl(photos[open], "large")} alt={alt} className="max-h-full max-w-full object-contain" />
            <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className="absolute left-2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20">‹</button>
            <button type="button" aria-label="Next photo" onClick={() => step(1)} className="absolute right-2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20">›</button>
          </div>
        </div>
      )}
    </>
  );
}
