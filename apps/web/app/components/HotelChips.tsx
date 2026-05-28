"use client";

import type { HotelOption } from "../lib/api";

export default function HotelChips({
  hotels,
  selected,
  onSelect,
}: {
  hotels: HotelOption[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  if (!hotels.length) {
    return (
      <div className="airline-chips">
        <span style={{ color: "var(--muted)", fontSize: 12, padding: "8px 0" }}>
          No hotels available.
        </span>
      </div>
    );
  }

  return (
    <div className="airline-chips">
      {hotels.map((h, i) => {
        const isTop = i === 0;
        const stars = Math.max(0, Math.min(5, Math.round(h.stars)));
        return (
          <button
            key={h.id}
            className={`airline-chip ${selected === i ? "selected" : ""}`}
            onClick={() => onSelect(i)}
            type="button"
          >
            {isTop && <span className="badge">Top pick</span>}

            <span
              className="logo"
              aria-hidden
              style={{
                background: h.thumbnail
                  ? `center / cover no-repeat url(${h.thumbnail})`
                  : "var(--rule)",
              }}
            />

            <span className="stack">
              <span className="primary serif">{h.name}</span>
              <span className="meta">
                {stars > 0 ? "★".repeat(stars) + " · " : ""}
                {h.city || h.address || h.country}
              </span>
            </span>

            <span className="stack">
              <span className="primary">
                {h.rating.toFixed(1)}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  / 10
                </span>
              </span>
              <span className="meta">
                {h.reviewCount.toLocaleString()} reviews
              </span>
            </span>

            <span className="pr" style={{ color: "var(--muted-2)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              {h.chain && h.chain !== "Not Available" ? h.chain : "Independent"}
            </span>
          </button>
        );
      })}
    </div>
  );
}