"use client";

import { useEffect } from "react";
import {
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import type { HotelOption } from "../lib/api";

type LatLng = { lat: number; lng: number };

export default function HotelGoogleMap({
  destination,
  destinationName,
  hotels,
  selectedIdx,
  reservedHotelId = null,
  onSelect,
}: {
  destination: LatLng;
  destinationName?: string;
  hotels: HotelOption[];
  selectedIdx: number;
  reservedHotelId?: string | null;
  onSelect: (index: number) => void;
}) {
  return (
    <Map
      mapId="MAJESTOR_HOTELS"
      defaultCenter={destination}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      style={{ width: "100%", height: "100%" }}
    >
      <FitBounds destination={destination} hotels={hotels} />

      <AdvancedMarker position={destination} zIndex={1}>
        <div className="dest-marker">
          <span className="dot" aria-hidden />
          <span className="lbl serif">{destinationName || "Destination"}</span>
        </div>
      </AdvancedMarker>

      {hotels.map((h, i) => {
        const isSel = i === selectedIdx;
        const isReserved = reservedHotelId !== null && h.id === reservedHotelId;
        return (
          <AdvancedMarker
            key={h.id}
            position={{ lat: h.latitude, lng: h.longitude }}
            onClick={() => onSelect(i)}
            zIndex={isReserved ? 1000 : isSel ? 999 : i + 2}
          >
            <div
              className={`hotel-pin ${isSel ? "selected" : ""} ${
                isReserved ? "reserved" : ""
              }`}
            >
              <span className="num">{isReserved ? "✓" : i + 1}</span>
              {(isSel || isReserved) && (
                <span className="name serif" title={h.name}>
                  {h.name}
                </span>
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </Map>
  );
}

// Pans/zooms the map to fit every hotel + the destination whenever the set
// changes. Keeps the user from manually dragging once the data arrives.
function FitBounds({
  destination,
  hotels,
}: {
  destination: LatLng;
  hotels: HotelOption[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || hotels.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(destination);
    hotels.forEach((h) => bounds.extend({ lat: h.latitude, lng: h.longitude }));
    map.fitBounds(bounds, 64);
  }, [map, destination, hotels]);

  return null;
}