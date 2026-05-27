"use client";

import type { Hotel } from "../lib/data";
import { fmtUSD } from "../lib/dates";

export default function HotelChips({
  hotels,
  selected,
  onSelect,
}: {
  hotels: Hotel[];
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
        return (
          <button
            key={i}
            className={`airline-chip ${selected === i ? "selected" : ""}`}
            onClick={() => onSelect(i)}
            type="button"
          >
            {isTop && <span className="badge">Top pick</span>}

            <span className="logo" aria-hidden style={{ background: "var(--rule)" }} />

            <span className="stack">
              <span className="primary serif">{h.name}</span>
              <span className="meta">
                {"★".repeat(h.stars)} · {h.reviews.toLocaleString()} reviews
              </span>
            </span>

            <span className="stack">
              <span className="primary">
                {h.score.toFixed(1)} <span style={{ color: "var(--muted)", fontWeight: 400 }}>/ 10</span>
              </span>
              <span className="meta">Review score</span>
            </span>

            <span className="pr">
              {fmtUSD(h.price)}
              <small>per night</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
