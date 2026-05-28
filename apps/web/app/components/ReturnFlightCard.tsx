"use client";

import { useState } from "react";
import type { FlightOption } from "../lib/api";
import FlightSummary from "./FlightSummary";
import AirlineChips from "./AirlineChips";
import FlightSVGMap from "./FlightSVGMap";
import { fmtDuration } from "../lib/dates";

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
    flights && flights.length > 0
      ? flights[Math.min(sel, flights.length - 1)]
      : null;
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
        <FlightSummary
          from={from}
          to={to}
          dur={headlineDur}
          via={selectedFlight?.via.map((v) => v.code) ?? []}
          depTime={selectedFlight?.departureTime}
          arrTime={selectedFlight?.arrivalTime}
        />

        <div className="leg-section">
          <div className="title">
            <strong>Flight</strong> <span>Return</span>
          </div>
          {flights === null ? (
            <div className="airline-chips" style={{ opacity: 0.55 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="airline-chip"
                  style={{ color: "var(--muted-2)", cursor: "default" }}
                >
                  <span className="logo" />
                  <span className="stack">
                    <span className="primary">Searching…</span>
                    <span className="meta">—</span>
                  </span>
                  <span className="stack">
                    <span className="primary serif">—</span>
                    <span className="meta">—</span>
                  </span>
                  <span className="pr">—</span>
                </div>
              ))}
            </div>
          ) : (
            <AirlineChips options={flights} selected={sel} onSelect={setSel} />
          )}
        </div>

        {selectedFlight && (
          <div className="leg-section">
            <div className="map-block svg-map">
              <FlightSVGMap
                origin={{
                  lat: selectedFlight.originLat,
                  lng: selectedFlight.originLng,
                }}
                destination={{
                  lat: selectedFlight.destinationLat,
                  lng: selectedFlight.destinationLng,
                }}
                via={selectedFlight.via.map((v) => ({
                  lat: v.latitude,
                  lng: v.longitude,
                }))}
              />
            </div>
            <div className="map-foot">
              <span>
                {selectedFlight.carrierCode} {selectedFlight.flightNumber}
                {selectedFlight.stops === 0
                  ? " · Direct"
                  : ` · ${selectedFlight.stops} stop${selectedFlight.stops > 1 ? "s" : ""}`}
              </span>
              <span>{fmtDuration(selectedFlight.durationMinutes)}</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}