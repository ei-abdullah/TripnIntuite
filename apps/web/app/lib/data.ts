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

export const D: Record<string, Destination> = {
  wadi_rum: {
    id: "wadi_rum", name: "Wadi Rum", country: "Jordan", nearest: "Aqaba",
    img: img("1518709594023-6eab9bab7b23", 1600),
    airport: "AQJ",
    blurb: "Sandstone monoliths over a quiet desert floor. Bedouin camps within easy walk of the Seven Pillars.",
    themes: ["desert", "mountain", "remote", "warm", "human"],
    sites: ["Khazali Canyon", "Lawrence's Spring", "Um Fruth rock bridge", "Sunset at Burrah Canyon"],
    tz: "Asia/Amman",
  },
  atacama: {
    id: "atacama", name: "San Pedro de Atacama", country: "Chile", nearest: "Calama",
    img: img("1539635278303-d4002c07eae3", 1600),
    airport: "CJC",
    blurb: "High-altitude desert framed by Andean volcanoes. Salt flats, hot springs, and a single low-slung town.",
    themes: ["desert", "mountain", "altitude", "stars", "human"],
    sites: ["Valle de la Luna", "El Tatio geysers", "Laguna Cejar", "Pukará de Quitor"],
    tz: "America/Santiago",
  },
  leh_ladakh: {
    id: "leh_ladakh", name: "Leh", country: "India", nearest: "Leh",
    img: img("1626621341517-bbf3d9990a23", 1600),
    airport: "IXL",
    blurb: "Cold desert at 3,500m, monasteries on bluffs, the Stok range as a constant horizon.",
    themes: ["desert", "mountain", "altitude", "remote", "human"],
    sites: ["Thiksey Monastery", "Pangong Lake", "Nubra Valley", "Leh Palace at dusk"],
    tz: "Asia/Kolkata",
  },
  tromso: {
    id: "tromso", name: "Tromsø", country: "Norway", nearest: "Tromsø",
    img: img("1531366936337-7c912a4589a7", 1600),
    airport: "TOS",
    blurb: "An island city inside the auroral oval. Snow on the surrounding peaks for most of the season.",
    themes: ["aurora", "snow", "mountain", "cold", "coast"],
    sites: ["Storsteinen by cable car", "Aurora hunt to Ersfjord", "Arctic Cathedral", "Sommarøy day trip"],
    tz: "Europe/Oslo",
  },
  abisko: {
    id: "abisko", name: "Abisko", country: "Sweden", nearest: "Kiruna",
    img: img("1517299321609-52687d1bc55a", 1600),
    airport: "KRN",
    blurb: "A microclimate gap in the mountains that keeps the sky clear when everywhere else is overcast.",
    themes: ["aurora", "snow", "mountain", "cold", "remote"],
    sites: ["Aurora Sky Station", "Kungsleden trail (winter)", "Lake Torneträsk", "Nikkaluokta day trip"],
    tz: "Europe/Stockholm",
  },
  reykjavik: {
    id: "reykjavik", name: "Þingvellir / Reykjavík", country: "Iceland", nearest: "Reykjavík",
    img: img("1490090188601-32637c44182d", 1600),
    airport: "KEF",
    blurb: "Volcanic rift, low light, and snow-capped highlands within an hour of the capital.",
    themes: ["aurora", "snow", "mountain", "cold", "coast"],
    sites: ["Þingvellir National Park", "Kerið crater", "Reynisfjara", "Blue Lagoon at dusk"],
    tz: "Atlantic/Reykjavik",
  },
  cinque_terre: {
    id: "cinque_terre", name: "Cinque Terre", country: "Italy", nearest: "La Spezia",
    img: img("1543429776-2782fc8e1acd", 1600),
    airport: "PSA",
    blurb: "Five fishing villages cut into the Ligurian cliffs. Trails between them and very little else.",
    themes: ["coast", "warm", "village", "walk", "food"],
    sites: ["Manarola viewpoint", "Sentiero Azzurro", "Vernazza harbour", "Monterosso beach"],
    tz: "Europe/Rome",
  },
  kyoto: {
    id: "kyoto", name: "Kyoto", country: "Japan", nearest: "Osaka",
    img: img("1493976040374-85c8e12f0c0e", 1600),
    airport: "KIX",
    blurb: "A grid of temples and machiya laid against the Higashiyama foothills.",
    themes: ["temple", "city", "walk", "food", "culture"],
    sites: ["Fushimi Inari at dawn", "Philosopher's Path", "Daitoku-ji sub-temples", "Pontochō at night"],
    tz: "Asia/Tokyo",
  },
  marrakech: {
    id: "marrakech", name: "Marrakech", country: "Morocco", nearest: "Marrakech",
    img: img("1597212618440-806262de4f6b", 1600),
    airport: "RAK",
    blurb: "A walled medina at the foot of the Atlas. Riads behind unmarked doors.",
    themes: ["desert", "warm", "city", "culture", "human"],
    sites: ["Jardin Majorelle", "Bahia Palace", "Medersa Ben Youssef", "Atlas day trip"],
    tz: "Africa/Casablanca",
  },
};

export const THEME_MAP: Record<string, string[]> = {
  "desert and mountains":         ["wadi_rum", "atacama", "leh_ladakh"],
  "desert mountain":              ["wadi_rum", "atacama", "leh_ladakh"],
  "desert":                       ["wadi_rum", "atacama", "marrakech"],
  "mountain":                     ["leh_ladakh", "atacama", "tromso"],
  "northern lights":              ["abisko", "tromso", "reykjavik"],
  "aurora":                       ["abisko", "tromso", "reykjavik"],
  "snowy mountains":              ["abisko", "tromso", "reykjavik"],
  "snow mountain":                ["abisko", "tromso", "reykjavik"],
  "coast":                        ["cinque_terre"],
  "village":                      ["cinque_terre"],
  "temple":                       ["kyoto"],
  "culture":                      ["kyoto", "marrakech"],
};

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

export const HOTELS: Record<string, Hotel[]> = {
  wadi_rum: [
    { name: "Wadi Rum Night Luxury Camp",  stars: 4, score: 9.1, reviews: 1240, price: 215 },
    { name: "Memories Aicha Luxury Camp",  stars: 4, score: 8.9, reviews: 980,  price: 188 },
    { name: "Bait Ali Lodge",              stars: 3, score: 8.4, reviews: 720,  price: 132 },
  ],
  atacama: [
    { name: "Tierra Atacama Hotel & Spa",  stars: 5, score: 9.4, reviews: 612,  price: 690 },
    { name: "Explora Atacama",             stars: 5, score: 9.3, reviews: 540,  price: 780 },
    { name: "Hotel Cumbres San Pedro",     stars: 4, score: 8.7, reviews: 1820, price: 260 },
  ],
  leh_ladakh: [
    { name: "The Grand Dragon Ladakh",     stars: 4, score: 9.0, reviews: 1410, price: 175 },
    { name: "Hotel Singge Palace",         stars: 3, score: 8.6, reviews: 720,  price: 110 },
    { name: "Stok Palace Heritage",        stars: 4, score: 9.2, reviews: 320,  price: 260 },
  ],
  tromso: [
    { name: "Clarion Hotel The Edge",      stars: 4, score: 8.8, reviews: 4210, price: 245 },
    { name: "Radisson Blu Tromsø",         stars: 4, score: 8.6, reviews: 3870, price: 220 },
    { name: "Scandic Ishavshotel",         stars: 4, score: 8.7, reviews: 2940, price: 235 },
  ],
  abisko: [
    { name: "Abisko Mountain Lodge",       stars: 4, score: 9.0, reviews: 540,  price: 290 },
    { name: "STF Abisko Turiststation",    stars: 3, score: 8.4, reviews: 1380, price: 165 },
    { name: "Camp Ripan (Kiruna)",         stars: 3, score: 8.5, reviews: 980,  price: 195 },
  ],
  reykjavik: [
    { name: "ION Adventure Hotel",         stars: 4, score: 9.0, reviews: 1240, price: 380 },
    { name: "The Reykjavik EDITION",       stars: 5, score: 9.2, reviews: 410,  price: 520 },
    { name: "Hotel Borg",                  stars: 4, score: 8.8, reviews: 2310, price: 295 },
  ],
  cinque_terre: [
    { name: "Hotel Marina Piccola",        stars: 3, score: 8.5, reviews: 1410, price: 220 },
    { name: "La Mala Boutique Guesthouse", stars: 3, score: 9.3, reviews: 380,  price: 310 },
    { name: "Hotel Pasquale",              stars: 3, score: 8.6, reviews: 980,  price: 245 },
  ],
  kyoto: [
    { name: "The Thousand Kyoto",          stars: 5, score: 9.2, reviews: 1840, price: 470 },
    { name: "Hoshinoya Kyoto",             stars: 5, score: 9.4, reviews: 320,  price: 1180 },
    { name: "Hotel Kanra Kyoto",           stars: 4, score: 9.1, reviews: 1240, price: 360 },
  ],
  marrakech: [
    { name: "La Mamounia",                 stars: 5, score: 9.3, reviews: 2840, price: 720 },
    { name: "Riad Yasmine",                stars: 4, score: 9.4, reviews: 1810, price: 195 },
    { name: "Royal Mansour Marrakech",     stars: 5, score: 9.5, reviews: 940,  price: 1280 },
  ],
};

export const AIRLINES_BY_DEST: Record<string, AirlineOption[]> = {
  wadi_rum:    [ { carrier: "Royal Jordanian", dur: "11h 50m", price: 920  }, { carrier: "Turkish",     dur: "13h 10m", price: 880  }, { carrier: "Lufthansa",   dur: "14h 25m", price: 940  } ],
  atacama:     [ { carrier: "LATAM",           dur: "14h 20m", price: 1180 }, { carrier: "American",    dur: "15h 05m", price: 1240 }, { carrier: "Delta",       dur: "15h 40m", price: 1310 } ],
  leh_ladakh:  [ { carrier: "Air India",       dur: "18h 40m", price: 1410 }, { carrier: "Emirates",    dur: "19h 25m", price: 1370 }, { carrier: "Qatar",       dur: "20h 10m", price: 1290 } ],
  tromso:      [ { carrier: "SAS",             dur: "10h 35m", price: 720  }, { carrier: "Norwegian",   dur: "11h 15m", price: 690  }, { carrier: "Lufthansa",   dur: "12h 20m", price: 745  } ],
  abisko:      [ { carrier: "SAS",             dur: "12h 10m", price: 760  }, { carrier: "Norwegian",   dur: "12h 40m", price: 720  }, { carrier: "Finnair",     dur: "13h 20m", price: 805  } ],
  reykjavik:   [ { carrier: "Icelandair",      dur: "5h 35m",  price: 480  }, { carrier: "PLAY",        dur: "5h 50m",  price: 410  }, { carrier: "Delta",       dur: "5h 45m",  price: 520  } ],
  cinque_terre:[ { carrier: "ITA Airways",     dur: "9h 45m",  price: 660  }, { carrier: "Lufthansa",   dur: "10h 30m", price: 590  }, { carrier: "Delta",       dur: "9h 30m",  price: 720  } ],
  kyoto:       [ { carrier: "ANA",             dur: "13h 50m", price: 1180 }, { carrier: "JAL",         dur: "14h 05m", price: 1240 }, { carrier: "United",      dur: "14h 20m", price: 1110 } ],
  marrakech:   [ { carrier: "Royal Air Maroc", dur: "7h 35m",  price: 620  }, { carrier: "Air France",  dur: "10h 20m", price: 690  }, { carrier: "Iberia",      dur: "11h 10m", price: 645  } ],
};
