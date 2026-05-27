"use client";

import { useState } from "react";
import type { FlightOption } from "../lib/api";
import { flightPathMapUrl } from "../lib/maps";
import { fmtDuration } from "../lib/dates";

type Tab = "flight" | "hotels";

export default function MapTabs({
  selectedFlight,
}: {
  selectedFlight: FlightOption | null;
}) {
  const [tab, setTab] = useState<Tab>("flight");

  return (
    <div className="map-tabs">
      <div className="map-tabs-head">
        <button
          type="button"
          className={`map-tab ${tab === "flight" ? "active" : ""}`}
          onClick={() => setTab("flight")}
        >
          Flight path
        </button>
        <button
          type="button"
          className={`map-tab ${tab === "hotels" ? "active" : ""}`}
          onClick={() => setTab("hotels")}
        >
          Hotels
        </button>
      </div>

      <div className="map-tabs-body">
        {tab === "flight" ? (
          <FlightPathPane flight={selectedFlight} />
        ) : (
          <HotelsPlaceholder />
        )}
      </div>
    </div>
  );
}

function FlightPathPane({ flight }: { flight: FlightOption | null }) {
  if (!flight) {
    return (
      <div className="map-block">
        <div className="map-empty">No flight selected.</div>
      </div>
    );
  }

  const url = flightPathMapUrl({
    origin: { lat: flight.originLat, lng: flight.originLng },
    destination: { lat: flight.destinationLat, lng: flight.destinationLng },
    via: flight.via.map((v) => ({ lat: v.latitude, lng: v.longitude })),
  });

  const stopsLabel =
    flight.stops === 0
      ? "Direct"
      : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;
  const viaLabel =
    flight.via.length > 0 ? ` · via ${flight.via.map((v) => v.code).join(" · ")}` : "";

  return (
    <>
      <div className="map-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Flight path from ${flight.carrierCode} ${flight.flightNumber}`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div className="map-foot">
        <span>
          {flight.carrierCode} {flight.flightNumber} · {stopsLabel}
          {viaLabel}
        </span>
        <span>{fmtDuration(flight.durationMinutes)}</span>
      </div>
    </>
  );
}

function HotelsPlaceholder() {
  return (
    <>
      <div className="map-block">
        <div className="map-empty">
          Real hotels coming soon — once the hotels API is wired up.
        </div>
      </div>
      <div className="map-foot">
        <span>Hotels integration pending</span>
      </div>
    </>
  );
}