"use client";

import { useState } from "react";
import type { FlightOption } from "../lib/api";
import type { Hotel } from "../lib/data";
import { fmtDuration, fmtUSD } from "../lib/dates";
import FlightSVGMap from "./FlightSVGMap";

type Tab = "flight" | "hotels";

export default function MapTabs({
  selectedFlight,
  selectedHotel,
}: {
  selectedFlight: FlightOption | null;
  selectedHotel: Hotel | null;
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
          <HotelsPlaceholder hotel={selectedHotel} />
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

  const stopsLabel =
    flight.stops === 0
      ? "Direct"
      : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;
  const viaLabel =
    flight.via.length > 0
      ? ` · via ${flight.via.map((v) => v.code).join(" · ")}`
      : "";

  return (
    <>
      <div className="map-block svg-map">
        <FlightSVGMap
          origin={{ lat: flight.originLat, lng: flight.originLng }}
          destination={{
            lat: flight.destinationLat,
            lng: flight.destinationLng,
          }}
          via={flight.via.map((v) => ({ lat: v.latitude, lng: v.longitude }))}
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

function HotelsPlaceholder({ hotel }: { hotel: Hotel | null }) {
  return (
    <>
      <div className="map-block">
        <div className="map-empty">
          Hotel map coming with real-API integration.
        </div>
      </div>
      <div className="map-foot">
        <span>{hotel ? hotel.name : "No hotel selected"}</span>
        <span>{hotel ? `${fmtUSD(hotel.price)} / night` : ""}</span>
      </div>
    </>
  );
}