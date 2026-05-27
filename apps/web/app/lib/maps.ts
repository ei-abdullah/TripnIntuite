// ---------------------------------------------------------------------------
// Google Static Maps URL builder + brand styling.
//
// We hit the Static Maps API with a `key` that's intended to be a
// frontend-restricted key (HTTP-referrer locked to your domain in Google Cloud
// Console). The variable is exposed via NEXT_PUBLIC_GOOGLE_MAPS_KEY.
// ---------------------------------------------------------------------------

const BASE = "https://maps.googleapis.com/maps/api/staticmap";

// Brand palette converted to Google's 0xRRGGBB format.
const COLOR_BG = "0xF7F5F0";
const COLOR_LAND = "0xEEEAE2";
const COLOR_RULE = "0xE4E0D8";
const COLOR_RULE_STRONG = "0xC9C4BA";
const COLOR_INK = "0x111111";
const COLOR_INK_2 = "0x2E2C28";
const COLOR_MUTED = "0x6B6862";
const COLOR_ACCENT = "0x9C3D1A";

// One-shot helper that returns the styling fragment of the URL. Each
// individual style= param targets one feature/element pair.
function brandStyles(): string {
  const styles: Array<[string, string]> = [
    ["feature:landscape|color:" + COLOR_LAND, ""],
    ["feature:water|color:" + COLOR_RULE, ""],
    ["feature:road|color:" + COLOR_RULE_STRONG, ""],
    ["feature:road|element:labels|visibility:off", ""],
    ["feature:poi|visibility:off", ""],
    ["feature:transit|visibility:off", ""],
    ["feature:administrative|element:geometry|color:" + COLOR_RULE_STRONG, ""],
    [
      "feature:administrative|element:labels.text.fill|color:" + COLOR_MUTED,
      "",
    ],
    [
      "feature:administrative|element:labels.text.stroke|color:" + COLOR_BG,
      "",
    ],
    ["feature:all|element:labels.icon|visibility:off", ""],
  ];
  return styles.map(([s]) => `style=${encodeURIComponent(s)}`).join("&");
}

export type LatLng = { lat: number; lng: number };

// Great-circle interpolation: returns a point at `fraction` (0..1) along the
// great-circle path between p1 and p2. fraction=0.5 is the midpoint of the arc,
// which can be far from the midpoint of the straight line.
function gcInterpolate(p1: LatLng, p2: LatLng, fraction: number): LatLng {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(p1.lat);
  const lng1 = toRad(p1.lng);
  const lat2 = toRad(p2.lat);
  const lng2 = toRad(p2.lng);
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (delta === 0) return { lat: p1.lat, lng: p1.lng };

  const A = Math.sin((1 - fraction) * delta) / Math.sin(delta);
  const B = Math.sin(fraction * delta) / Math.sin(delta);
  const x =
    A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y =
    A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

// Sample N points along the geodesic path between each consecutive pair of
// points. This ensures the bounding box includes the actual curve, not just
// the straight line between markers.
function sampleGeodesic(points: LatLng[], samplesPerSegment = 8): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (let s = 0; s <= samplesPerSegment; s++) {
      out.push(gcInterpolate(a, b, s / samplesPerSegment));
    }
  }
  return out;
}

// Compute padded bounding-box corners from a list of points.
function paddedBounds(points: LatLng[], padFactor = 0.06): LatLng[] {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);

  // Pins are anchored at their bottom — extra top padding so they don't get
  // cropped at the edges when the map is zoomed out.
  const latPad = Math.max((latMax - latMin) * padFactor, 4);
  const lngPad = Math.max((lngMax - lngMin) * padFactor, 4);

  return [
    { lat: latMin - latPad, lng: lngMin - lngPad },
    { lat: latMin - latPad, lng: lngMax + lngPad },
    { lat: latMax + latPad, lng: lngMin - lngPad },
    { lat: latMax + latPad, lng: lngMax + lngPad },
  ];
}

export function flightPathMapUrl({
  origin,
  destination,
  via,
  width = 640,
  height = 220,
}: {
  origin: LatLng;
  destination: LatLng;
  via: LatLng[];
  width?: number;
  height?: number;
}): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

  const points = [origin, ...via, destination];

  const pathLine =
    `path=color:${COLOR_ACCENT}|weight:2|geodesic:true|` +
    points.map((p) => `${p.lat},${p.lng}`).join("|");

  const markers = [
    `markers=size:small|color:${COLOR_ACCENT}|${origin.lat},${origin.lng}`,
    `markers=size:small|color:${COLOR_INK}|${destination.lat},${destination.lng}`,
    ...via.map(
      (v) =>
        `markers=size:tiny|color:${COLOR_ACCENT}|${v.lat},${v.lng}`,
    ),
  ].join("&");

  // Force the viewport to include the entire arc + padding around it.
  const arcSamples = sampleGeodesic(points, 8);
  const corners = paddedBounds(arcSamples, 0.10);
  const visibleParam =
    "visible=" +
    [...arcSamples, ...corners]
      .map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
      .join("|");

  return [
    `${BASE}?size=${width}x${height}`,
    `scale=2`,
    `maptype=roadmap`,
    brandStyles(),
    pathLine,
    markers,
    visibleParam,
    `key=${key}`,
  ].join("&");
}