"use client";

import { useState } from "react";
import type { FlightOption, HotelOption } from "../lib/api";
import { fmtDuration } from "../lib/dates";
import FlightSVGMap from "./FlightSVGMap";
import HotelSVGMap from "./HotelSVGMap";

type Tab = "flight" | "hotels";

export default function MapTabs({
  selectedFlight,
  selectedHotel,
  destination,
  hotels,
  hotelSelectedIdx,
}: {
  selectedFlight: FlightOption | null;
  selectedHotel: HotelOption | null;
  destination: { lat: number; lng: number };
  hotels: HotelOption[];
  hotelSelectedIdx: number;
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
          <HotelsPane
            destination={destination}
            hotels={hotels}
            selectedIdx={hotelSelectedIdx}
            selectedHotel={selectedHotel}
          />
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

function HotelsPane({
  destination,
  hotels,
  selectedIdx,
  selectedHotel,
}: {
  destination: { lat: number; lng: number };
  hotels: HotelOption[];
  selectedIdx: number;
  selectedHotel: HotelOption | null;
}) {
  if (hotels.length === 0) {
    return (
      <>
        <div className="map-block">
          <div className="map-empty">No hotels found in this area.</div>
        </div>
        <div className="map-foot">
          <span>—</span>
          <span></span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="map-block svg-map">
        <HotelSVGMap
          destination={destination}
          hotels={hotels}
          selectedIdx={selectedIdx}
        />
      </div>
      <div className="map-foot">
        <span>
          {selectedHotel
            ? `${selectedHotel.name} · ${selectedHotel.city || selectedHotel.country}`
            : `${hotels.length} hotels near destination`}
        </span>
        <span>
          {selectedHotel
            ? `${selectedHotel.rating.toFixed(1)} / 10 · ${selectedHotel.reviewCount.toLocaleString()} reviews`
            : ""}
        </span>
      </div>
    </>
  );
}