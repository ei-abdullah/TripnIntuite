"use client";

import type {FlightOption} from "../lib/api";
import {fmtChipDate, fmtClock, fmtDuration, fmtUSD} from "../lib/dates";

export default function AirlineChips({
  options,
  selected,
  onSelect,
}: {
  options: FlightOption[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  if (!options.length) {
    return (
      <div className="airline-chips">
        <span style={{ color: "var(--muted)", fontSize: 12, padding: "8px 0" }}>
          No flights returned for this leg.
        </span>
      </div>
    );
  }

  return (
    <div className="airline-chips">
      {options.map((o, i) => {
        const stopsLabel =
          o.stops === 0 ? "Direct" : `${o.stops} stop${o.stops > 1 ? "s" : ""}`;
        const viaLabel =
          o.via.length > 0 ? ` · via ${o.via.map((v) => v.code).join("/")}` : "";
        const dayShift = dayDelta(o.departureTime, o.arrivalTime);

        return (
          <button
            key={o.offerId}
            className={`airline-chip ${selected === i ? "selected" : ""}`}
            onClick={() => onSelect(i)}
            type="button"
          >
            {o.isCheapest && <span className="badge">Best value</span>}

            <span
              className="logo"
              style={
                o.carrierLogo
                  ? { backgroundImage: `url(${o.carrierLogo})` }
                  : undefined
              }
              aria-hidden
            />

            <span className="stack">
              <span className="primary">{o.carrierName}</span>
              <span className="meta">
                {o.carrierCode} {o.flightNumber} · {fmtChipDate(o.departureTime)}
              </span>
            </span>

            <span className="stack">
              <span className="primary serif">
                {fmtClock(o.departureTime)} → {fmtClock(o.arrivalTime)}
                {dayShift > 0 && (
                  <span className="next-day">+{dayShift}d</span>
                )}
              </span>
              <span className="meta">
                {fmtDuration(o.durationMinutes)} · {stopsLabel}{viaLabel}
              </span>
            </span>

            <span className="pr">
              {fmtUSD(o.price)}
              <small>{o.currency}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function dayDelta(depISO: string, arrISO: string): number {
  const dep = depISO.split("T")[0];
  const arr = arrISO.split("T")[0];
  if (!dep || !arr) return 0;
  const depD = new Date(dep + "T00:00:00Z").getTime();
  const arrD = new Date(arr + "T00:00:00Z").getTime();
  return Math.round((arrD - depD) / (24 * 3600 * 1000));
}