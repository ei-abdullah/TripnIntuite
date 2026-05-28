"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

const GEO_URL = "/world-110m.json";

type LatLng = { lat: number; lng: number };

const COLOR_LAND = "#EEEAE2";
const COLOR_BORDER = "#C9C4BA";
const COLOR_BG = "#F7F5F0";
const COLOR_DEST = "#111111";
const COLOR_PIN = "#9C3D1A";
const COLOR_PIN_DIM = "#C9846B";

// Module-level cache shared with FlightSVGMap.
let geoCache: unknown = null;
let geoPromise: Promise<unknown> | null = null;

function loadGeoData(): Promise<unknown> {
  if (geoCache) return Promise.resolve(geoCache);
  if (geoPromise) return geoPromise;
  geoPromise = fetch(GEO_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((topo: Topology) => {
      const parsed = feature(topo, topo.objects.countries);
      geoCache = parsed;
      return parsed;
    })
    .catch((e) => {
      console.error("Failed to load world map data:", e);
      geoPromise = null;
      throw e;
    });
  return geoPromise;
}

export default function HotelSVGMap({
  destination,
  hotels,
  selectedIdx,
}: {
  destination: LatLng;
  hotels: { latitude: number; longitude: number }[];
  selectedIdx: number;
}) {
  const [geoData, setGeoData] = useState<unknown>(geoCache);

  useEffect(() => {
    if (!geoCache) {
      loadGeoData().then(setGeoData).catch(() => {});
    }
  }, []);

  const { center, scale } = useMemo(() => {
    // Center on the destination — the hotel cluster will appear around it.
    // We deliberately don't zoom in past country-scale: the world-110m
    // topology has no street-level detail, so very tight zooms look like a
    // blob. Instead show the region recognizably; hotels read as a pin
    // cluster near the destination.
    const MIN_SPAN_DEG = 18; // ~country-scale view
    const span = MIN_SPAN_DEG;
    const rawScale = 160 * (360 / (span * 1.8));
    const scale = Math.max(400, Math.min(1400, rawScale));

    return {
      center: [destination.lng, destination.lat] as [number, number],
      scale,
    };
  }, [destination]);

  if (!geoData) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
        }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{ center, scale }}
      width={1280}
      height={420}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <Geographies geography={geoData}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill={COLOR_LAND}
              stroke={COLOR_BORDER}
              strokeWidth={0.4}
              style={{
                default: { outline: "none" },
                hover: { outline: "none", fill: COLOR_LAND },
                pressed: { outline: "none" },
              }}
            />
          ))
        }
      </Geographies>

      <Marker coordinates={[destination.lng, destination.lat]}>
        <circle r={6} fill={COLOR_DEST} stroke={COLOR_BG} strokeWidth={2} />
      </Marker>

      {hotels.map((h, i) => {
        const isSel = i === selectedIdx;
        return (
          <Marker
            key={`hotel-${i}`}
            coordinates={[h.longitude, h.latitude]}
          >
            <circle
              r={isSel ? 5 : 3.5}
              fill={isSel ? COLOR_PIN : COLOR_BG}
              stroke={isSel ? COLOR_BG : COLOR_PIN_DIM}
              strokeWidth={isSel ? 2 : 1.5}
            />
          </Marker>
        );
      })}
    </ComposableMap>
  );
}