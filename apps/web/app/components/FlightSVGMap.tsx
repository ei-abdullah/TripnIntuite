"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

const GEO_URL = "/world-110m.json";

type LatLng = { lat: number; lng: number };

const COLOR_LAND = "#EEEAE2";
const COLOR_BORDER = "#C9C4BA";
const COLOR_ARC = "#9C3D1A";
const COLOR_ARC_BG = "#F7F5F0";
const COLOR_ORIGIN = "#9C3D1A";
const COLOR_DEST = "#111111";

// Module-level cache so multiple legs don't re-fetch.
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
      // world-atlas TopoJSON has an object named "countries".
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

export default function FlightSVGMap({
  origin,
  destination,
  via,
}: {
  origin: LatLng;
  destination: LatLng;
  via: LatLng[];
}) {
  const [geoData, setGeoData] = useState<unknown>(geoCache);

  useEffect(() => {
    if (!geoCache) {
      loadGeoData().then(setGeoData).catch(() => {});
    }
  }, []);

  const points = useMemo(
    () => [origin, ...via, destination],
    [origin, via, destination],
  );

  const { center, scale } = useMemo(() => {
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);

    const centerLat = (latMax + latMin) / 2;
    const centerLng = (lngMax + lngMin) / 2;

    const latSpan = Math.max(latMax - latMin, 6) * 1.6;
    const lngSpan = Math.max(lngMax - lngMin, 6) * 1.4;
    const dominantSpan = Math.max(latSpan * 2, lngSpan);
    const rawScale = 160 * (360 / dominantSpan);
    const scale = Math.max(120, Math.min(1600, rawScale));

    return {
      center: [centerLng, centerLat] as [number, number],
      scale,
    };
  }, [points]);

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

      {points.slice(0, -1).map((pt, i) => {
        const next = points[i + 1];
        return (
          <Line
            key={`arc-${i}`}
            from={[pt.lng, pt.lat]}
            to={[next.lng, next.lat]}
            stroke={COLOR_ARC}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}

      <Marker coordinates={[origin.lng, origin.lat]}>
        <circle
          r={5.5}
          fill={COLOR_ORIGIN}
          stroke={COLOR_ARC_BG}
          strokeWidth={2}
        />
      </Marker>

      {via.map((v, i) => (
        <Marker key={`via-${i}`} coordinates={[v.lng, v.lat]}>
          <circle
            r={3.5}
            fill={COLOR_ARC_BG}
            stroke={COLOR_ORIGIN}
            strokeWidth={1.5}
          />
        </Marker>
      ))}

      <Marker coordinates={[destination.lng, destination.lat]}>
        <circle
          r={5.5}
          fill={COLOR_DEST}
          stroke={COLOR_ARC_BG}
          strokeWidth={2}
        />
      </Marker>
    </ComposableMap>
  );
}
