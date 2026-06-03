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
  reservedHotelId = null,
  detailsLocked = false,
}: {
  hotels: HotelOption[];
  selected: number;
  onSelect: (index: number) => void;
  onViewDetails: (index: number) => void;
  reservedHotelId?: string | null;
  // Once a hotel is reserved for the leg, details are locked for every chip —
  // editing happens in the trip-level bookings drawer.
  detailsLocked?: boolean;
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
        const isReserved = reservedHotelId === h.id;
        // A reservation exists for this leg, but on another hotel → this one
        // can't be booked until the guest edits their reservation.
        const lockedOut = reservedHotelId !== null && !isReserved;
        return (
          <div
            key={h.id}
            className={`airline-chip ${selected === i ? "selected" : ""}`}
            onClick={() => onSelect(i)}
            role="button"
            tabIndex={0}
            style={lockedOut ? { opacity: 0.5 } : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(i);
              }
            }}
          >
            {isReserved ? (
              <span
                className="badge"
                style={{
                  background: "rgba(21,128,61,0.12)",
                  color: "#166534",
                }}
              >
                Reserved
              </span>
            ) : (
              isTop && reservedHotelId === null && (
                <span className="badge">Top pick</span>
              )
            )}

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
              disabled={detailsLocked}
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(i);
              }}
              className={`ml-3.5 shrink-0 whitespace-nowrap text-[11px] uppercase tracking-[0.16em] transition-colors ${
                detailsLocked
                  ? "cursor-not-allowed text-(--muted-2)"
                  : "text-(--accent) hover:text-(--ink)"
              }`}
            >
              {isReserved ? "Reserved ✓" : "Details →"}
            </button>
          </div>
        );
      })}
    </div>
  );
}