"use client";

import type { HotelOption } from "../lib/api";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export default function HotelChips({
  hotels,
  selected,
  onSelect,
  onViewDetails,
}: {
  hotels: HotelOption[];
  selected: number;
  onSelect: (index: number) => void;
  onViewDetails: (index: number) => void;
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
        const perNight =
          h.available && h.nights > 0 ? h.totalPrice / h.nights : null;
        return (
          <div
            key={h.id}
            className={`airline-chip ${selected === i ? "selected" : ""}`}
            onClick={() => onSelect(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(i);
              }
            }}
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
                {h.rating.toFixed(1)} · {h.city || h.address || h.country}
              </span>
            </span>

            <span
              className="stack"
              style={{ marginLeft: "auto", textAlign: "right" }}
            >
              {perNight !== null ? (
                <>
                  <span className="primary serif">
                    {money(perNight, h.currency)}
                  </span>
                  <span className="meta">/ night</span>
                </>
              ) : (
                <span className="meta" style={{ fontStyle: "italic" }}>
                  Rates on request
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(i);
              }}
              className="ml-3.5 shrink-0 whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-(--accent) transition-colors hover:text-(--ink)"
            >
              Details →
            </button>
          </div>
        );
      })}
    </div>
  );
}