import { Destination } from "./data";

type BackendMatchedLocation = {
  id: string;
  name: string;
  country: string;
  nearestCity: string;
  nearestAirport: string;
  latitude: number;
  longitude: number;
  description: string;
  matchScore: number;
};

type BackendSegmentWithLocations = {
  index: number;
  description: string;
  keywords: string[];
  locations: BackendMatchedLocation[];
};

type BackendParseResponse = {
  prompt: string;
  segments: BackendSegmentWithLocations[];
};

export type CardWithMatch = Destination & { match: number };
export type Intuition = {
  idx: number;
  segment: string;
  theme: string;
  cards: CardWithMatch[];
};

function placeholderImage(id: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(id)}/1200/800`;
}

function toCard(loc: BackendMatchedLocation, keywords: string[]): CardWithMatch {
  return {
    id: loc.id,
    name: loc.name,
    country: loc.country,
    nearest: loc.nearestCity,
    img: placeholderImage(loc.id),
    airport: loc.nearestAirport,
    blurb: loc.description,
    themes: keywords,
    sites: [],
    tz: "UTC",
    match: Math.round(loc.matchScore * 100),
  };
}

function toIntuition(segment: BackendSegmentWithLocations, idx: number): Intuition {
  return {
    idx,
    segment: segment.description,
    theme: segment.keywords[0] ?? "unknown",
    cards: segment.locations.map((l) => toCard(l, segment.keywords)),
  };
}

export async function parsePrompt(prompt: string): Promise<Intuition[]> {
  const res = await fetch(`/api/trip/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    throw new Error(`Parse failed: ${res.status} ${res.statusText}`);
  }
  const data: BackendParseResponse = await res.json();
  return data.segments.map(toIntuition);
}