"use client";

import {useState} from "react";
import type {FlightOption} from "../lib/api";
import FlightSummary from "./FlightSummary";
import AirlineChips from "./AirlineChips";
import {fmtDuration} from "../lib/dates";

export default function ReturnFlightCard({
  from,
  to,
  dateLabel,
  flights,
}: {
  from: string;
  to: string;
  dateLabel: string;
  flights: FlightOption[] | null;
}) {
  const [sel, setSel] = useState(0);
  const selectedFlight =
    flights && flights.length > 0 ? flights[Math.min(sel, flights.length - 1)] : null;
  const headlineDur = selectedFlight
    ? fmtDuration(selectedFlight.durationMinutes)
    : "…";

  return (
    <article className="leg-card return-card">
      <div className="leg-card-head">
        <div>
          <div className="lab">Return · home</div>
          <h3 className="serif">
            Back <em>home</em>
          </h3>
        </div>
        <div className="dates">{dateLabel}</div>
      </div>
      <div className="leg-body">
        <div>
          <div className="leg-section">
            <div className="title">
              <strong>Flight</strong> <span>Return</span>
            </div>
            <FlightSummary
              from={from}
              to={to}
              dur={headlineDur}
              via={selectedFlight?.via ?? []}
              depTime={selectedFlight?.departureTime}
              arrTime={selectedFlight?.arrivalTime}
            />
            {flights === null ? (
              <div className="airline-chips" style={{ opacity: 0.55 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="airline-chip"
                    style={{ color: "var(--muted-2)", cursor: "default" }}
                  >
                    <span className="nm">Searching…</span>
                    <span className="du">—</span>
                    <span className="pr">—</span>
                  </div>
                ))}
              </div>
            ) : (
              <AirlineChips
                options={flights}
                selected={sel}
                onSelect={setSel}
              />
            )}
          </div>
        </div>
        <div></div>
      </div>
    </article>
  );
}