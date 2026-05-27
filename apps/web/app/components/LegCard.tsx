"use client";

import {useState} from "react";
import type {Destination} from "../lib/data";
import {HOTELS} from "../lib/data";
import type {FlightOption} from "../lib/api";
import FlightSummary from "./FlightSummary";
import AirlineChips from "./AirlineChips";
import MapTabs from "./MapTabs";
import {fmtDuration, fmtUSD} from "../lib/dates";

export default function LegCard({
  leg,
  prevDest,
  from,
  to,
  dateRange,
  flightDateLabel,
  flights,
  idx,
  total,
}: {
  leg: Destination;
  prevDest: Destination | null;
  from: string;
  to: string;
  dateRange: string;
  flightDateLabel: string;
  flights: FlightOption[] | null;
  idx: number;
  total: number;
}) {
  const hotels = HOTELS[leg.id] || [];
  const [sel, setSel] = useState(0);
  const selectedFlight =
    flights && flights.length > 0 ? flights[Math.min(sel, flights.length - 1)] : null;
  const headlineDur = selectedFlight
    ? fmtDuration(selectedFlight.durationMinutes)
    : "…";

  return (
    <article className="leg-card">
      <div className="leg-card-head">
        <div>
          <div className="lab">
            Leg {String(idx + 1).padStart(2, "0")} of{" "}
            {String(total).padStart(2, "0")}
          </div>
          <h3 className="serif">
            {leg.name}, <em>{leg.country}</em>
          </h3>
        </div>
        <div className="dates">{dateRange}</div>
      </div>

      <div className="leg-body">
        <div>
          <div className="leg-section">
            <div className="title">
              <strong>Flight</strong>{" "}
              <span>
                {prevDest
                  ? `${prevDest.name} → ${leg.name}`
                  : `Home → ${leg.name}`}
              </span>{" "}
              <span style={{ marginLeft: "auto" }}>{flightDateLabel}</span>
            </div>
            <FlightSummary
              from={from}
              to={to}
              dur={headlineDur}
              via={selectedFlight?.via.map((v) => v.code) ?? []}
              depTime={selectedFlight?.departureTime}
              arrTime={selectedFlight?.arrivalTime}
            />
            {flights === null ? (
              <FlightsSkeleton />
            ) : (
              <AirlineChips
                options={flights}
                selected={sel}
                onSelect={setSel}
              />
            )}
          </div>

          <div className="leg-section">
            <div className="title">
              <strong>Hotels</strong>{" "}
              <span>vetted picks from Booking.com</span>
            </div>
            {hotels.map((h, i) => (
              <div key={i} className="hotel-row">
                <div>
                  <div className="nm serif">{h.name}</div>
                  <div className="meta">
                    {"★".repeat(h.stars)}
                    {"☆".repeat(5 - h.stars)} · {h.reviews.toLocaleString()}{" "}
                    reviews
                  </div>
                </div>
                <div className="score">
                  <div className="v num">{h.score.toFixed(1)}</div>
                  <small>Review</small>
                </div>
                <div className="price">
                  <div className="amt num">{fmtUSD(h.price)}</div>
                  <small>per night</small>
                </div>
              </div>
            ))}
          </div>

          <div className="leg-section">
            <div className="title">
              <strong>Sites to visit</strong>{" "}
              <span>recommended by TripIntuition</span>
            </div>
            <div className="sites-chips">
              {leg.sites.map((s, i) => (
                <span key={i} className="site-chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="leg-section">
            <MapTabs selectedFlight={selectedFlight} />
          </div>
        </div>
      </div>
    </article>
  );
}

function FlightsSkeleton() {
  return (
    <div className="airline-chips" style={{ opacity: 0.55 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="airline-chip"
          style={{
            color: "var(--muted-2)",
            cursor: "default",
            background:
              "linear-gradient(90deg, transparent, var(--rule) 50%, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
          }}
        >
          <span className="nm">Searching…</span>
          <span className="du">—</span>
          <span className="pr">—</span>
        </div>
      ))}
    </div>
  );
}