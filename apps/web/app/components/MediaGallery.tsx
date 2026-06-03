"use client";

import { useEffect, useState } from "react";

export type MediaItem = {
  type: "image" | "video";
  url: string;
  caption?: string | null;
};

// Direct video files we can play inline; anything else (YouTube/Vimeo/players)
// is embedded in an iframe.
function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

export default function MediaGallery({
  media,
  fallback,
}: {
  media: MediaItem[];
  fallback?: string | null;
}) {
  const [i, setI] = useState(0);

  const items: MediaItem[] =
    media.length > 0
      ? media
      : fallback
        ? [{ type: "image", url: fallback }]
        : [];

  // Keep the index valid as the media set changes (e.g. details arrive, or a
  // new hotel opens) without a synchronous reset in an effect.
  const idx = items.length > 0 ? i % items.length : 0;
  const many = items.length > 1;

  useEffect(() => {
    if (!many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [many, items.length]);

  if (items.length === 0) {
    return <div className="h-[260px] w-full bg-(--rule)" />;
  }

  const cur = items[idx];
  const go = (n: number) => setI(((n % items.length) + items.length) % items.length);

  return (
    <div className="relative h-[260px] w-full overflow-hidden bg-black">
      {cur.type === "video" ? (
        isVideoFile(cur.url) ? (
          <video
            key={cur.url}
            src={cur.url}
            controls
            playsInline
            className="h-full w-full bg-black object-contain"
          />
        ) : (
          <iframe
            key={cur.url}
            src={cur.url}
            title="Hotel video"
            allow="autoplay; encrypted-media; fullscreen"
            className="h-full w-full"
          />
        )
      ) : (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${cur.url})` }}
          role="img"
          aria-label={cur.caption ?? "Hotel photo"}
        />
      )}

      {cur.type === "image" && cur.caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-2.5 pt-10 text-[12px] text-white/90">
          {cur.caption}
        </div>
      )}

      {many && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(idx - 1)}
            className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-[18px] leading-none text-white transition-colors hover:bg-black/65"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(idx + 1)}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-[18px] leading-none text-white transition-colors hover:bg-black/65"
          >
            ›
          </button>

          <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">
            {idx + 1} / {items.length}
          </div>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {items.slice(0, 12).map((_, di) => (
              <button
                key={di}
                type="button"
                aria-label={`Go to item ${di + 1}`}
                onClick={() => setI(di)}
                className={`h-1.5 rounded-full transition-all ${
                  di === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}