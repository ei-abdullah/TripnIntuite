"use client";

import { useTripStore } from "../lib/tripStore";

export default function Footer() {
  const departureAirport = useTripStore((s) => s.departureAirport);

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© 2026 TripIntuition</span>
        <span>
          Departing from{" "}
          <strong style={{ color: "var(--ink)" }}>
            {departureAirport ? departureAirport.name : "—"}
          </strong>
        </span>
      </div>
    </footer>
  );
}