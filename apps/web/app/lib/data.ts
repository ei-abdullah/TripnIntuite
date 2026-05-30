export type Destination = {
  id: string;
  name: string;
  country: string;
  nearest: string;
  img: string;
  airport: string;
  blurb: string;
  themes: string[];
  sites: string[];
  tz: string;
  latitude: number;
  longitude: number;
};

export type Hotel = {
  name: string;
  stars: number;
  score: number;
  reviews: number;
  price: number;
};

export type AirlineOption = {
  carrier: string;
  dur: string;
  price: number;
};

export type PastSearch = {
  id: string;
  date: string;
  legs: number;
  prompt: string;
  thumb: string;
};

export const img = (id: string, w: number = 1400): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PAST: PastSearch[] = [
  { id: "p1", date: "Apr 28, 2026", legs: 2,
    prompt: "I want to go somewhere with desert and mountains and some human populations, then I want to see northern lights on snowy mountains.",
    thumb: "1518709594023-6eab9bab7b23" },
  { id: "p2", date: "Mar 11, 2026", legs: 1,
    prompt: "A quiet coastal village, with footpaths between houses and good wine.",
    thumb: "1543429776-2782fc8e1acd" },
  { id: "p3", date: "Feb 02, 2026", legs: 3,
    prompt: "An old city with temples, then mountains, then a coast where I can swim.",
    thumb: "1493976040374-85c8e12f0c0e" },
  { id: "p4", date: "Jan 14, 2026", legs: 2,
    prompt: "Somewhere warm with high culture and a desert nearby, then alpine snow.",
    thumb: "1597212618440-806262de4f6b" },
];