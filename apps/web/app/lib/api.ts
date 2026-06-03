import {Destination} from "./data";
import {useAuthStore} from "./authStore";

// ----------------------------------------------------------------
// Shared types (mirror backend DTOs)
// ----------------------------------------------------------------
export type UserDto = {
  id: number;
  email: string;
  username: string;
  roles: string[];
  verified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: UserDto;
};

export type ApiErrorBody = {
  path: string;
  message: string;
  statusCode: number;
  instantDateTime: string;
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;
  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// ----------------------------------------------------------------
// Authenticated fetch
// ----------------------------------------------------------------
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    // Token is invalid or expired — drop it.
    useAuthStore.getState().clearAuth();
  }
  return res;
}

async function readError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // non-JSON body
  }
  const msg = body?.message ?? `${res.status} ${res.statusText}`;
  return new ApiError(res.status, msg, body);
}

// ----------------------------------------------------------------
// Auth endpoints
// ----------------------------------------------------------------
export async function signup(input: {
  email: string;
  username: string;
  password: string;
}): Promise<UserDto> {
  const res = await apiFetch("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function getMe(): Promise<UserDto> {
  const res = await apiFetch("/api/v1/auth/me", { method: "GET" });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export function logout(): void {
  useAuthStore.getState().clearAuth();
}

// ----------------------------------------------------------------
// Trip parse — same as before, now authenticated
// ----------------------------------------------------------------
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
    latitude: loc.latitude,
    longitude: loc.longitude,
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

export type ViaPoint = {
  code: string;
  latitude: number;
  longitude: number;
};

export type FlightOption = {
  offerId: string;
  carrierCode: string;
  carrierName: string;
  carrierLogo: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  via: ViaPoint[];
  price: number;
  currency: string;
  isCheapest: boolean;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
};

export type LegResult = {
  origin: string;
  destination: string;
  date: string;
  options: FlightOption[];
};

export async function getFlightsForLeg(
  origin: string,
  destination: string,
  date: string,
): Promise<LegResult> {
  const res = await apiFetch(
    `/api/trip/flights?origin=${origin}&destination=${destination}&date=${date}`,
    { method: "GET" },
  );
  if (!res.ok) throw await readError(res);
  return res.json();
}

export type HotelOption = {
  id: string;
  name: string;
  description: string;
  chain: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  mainPhoto: string;
  thumbnail: string;
  stars: number;
  rating: number;
  reviewCount: number;
  available: boolean;
  totalPrice: number;
  currency: string;
  nights: number;
};

export type HotelResult = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  hotels: HotelOption[];
};

export async function getHotelsForLeg(
  lat: number,
  lng: number,
  checkin: string,
  checkout: string,
  radiusMeters = 25000,
): Promise<HotelResult> {
  const res = await apiFetch(
    `/api/trip/hotels?lat=${lat}&lng=${lng}&checkin=${checkin}&checkout=${checkout}&radius=${radiusMeters}`,
    { method: "GET" },
  );
  if (!res.ok) throw await readError(res);
  return res.json();
}

export type RoomOffer = {
  offerId: string;
  name: string;
  boardName: string;
  totalAmount: number;
  suggestedPrice: number;
  currency: string;
  refundable: boolean;
  cancellationDeadline: string | null;
  maxOccupancy: number;
  perks: string[];
};

export type HotelRates = {
  hotelId: string;
  checkin: string;
  checkout: string;
  nights: number;
  currency: string;
  rooms: RoomOffer[];
};

export async function getHotelRates(
  hotelId: string,
  checkin: string,
  checkout: string,
  adults = 2,
): Promise<HotelRates> {
  const res = await apiFetch(
    `/api/trip/hotels/${encodeURIComponent(hotelId)}/rates?checkin=${checkin}&checkout=${checkout}&adults=${adults}`,
    { method: "GET" },
  );
  if (!res.ok) throw await readError(res);
  return res.json();
}

// Booking step 1: prebook a room offer. Locks the final price and returns a
// prebookId for the book step. priceDifferencePercent !== 0, or either changed
// flag being true, means the rate shifted since it was shown.
export type PrebookResult = {
  prebookId: string;
  offerId: string;
  hotelId: string;
  checkin: string;
  checkout: string;
  currency: string;
  price: number;
  priceDifferencePercent: number;
  cancellationChanged: boolean;
  boardChanged: boolean;
  termsAndConditions: string | null;
  paymentTypes: string[];
};

export async function prebookHotel(offerId: string): Promise<PrebookResult> {
  const res = await apiFetch("/api/trip/hotels/prebook", {
    method: "POST",
    body: JSON.stringify({ offerId }),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

// Booking step 2: finalize the reservation from a prebookId. Sandbox pays via
// ACC_CREDIT_CARD (simulated, no real charge) and returns a confirmed booking.
export type Guest = { firstName: string; lastName: string; email: string };

export type HotelBookResult = {
  bookingId: string;
  status: string;
  hotelConfirmationCode: string | null;
  checkin: string;
  checkout: string;
  price: number;
  currency: string;
};

export async function bookHotel(input: {
  prebookId: string;
  holder: Guest;
  guests: Guest[];
}): Promise<HotelBookResult> {
  const res = await apiFetch("/api/trip/hotels/book", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

// ----------------------------------------------------------------
// Flight prebook (checkout). Unlike hotels, the flight prebook call itself
// requires the traveller's contact + passenger details, so it fires from the
// checkout screen — not from the itinerary. Sandbox credit-line (no Stripe).
// ----------------------------------------------------------------
export type Contact = {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneCountryCode?: string;
  phoneNumber: string;
};

// passengerType: 0 = adult, 1 = child, 2 = infant. gender: "M" | "F".
export type Passenger = {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: string;
  birthday?: string;
  nationality?: string;
  passengerType?: number;
  documentType?: string;
  documentNumber?: string;
  documentExpiry?: string;
  documentIssueCountry?: string;
};

// simulated=true: a synthesized confirmation (real LiteAPI flight booking is
// payment-gated and unavailable on this sandbox account).
export type FlightBookResult = {
  bookingRef: string;
  offerId: string;
  status: string;
  simulated: boolean;
};

export async function bookFlight(input: {
  offerId: string;
  contact: Contact;
  passengers: Passenger[];
}): Promise<FlightBookResult> {
  const res = await apiFetch("/api/trip/flights/book", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

// Rich, content-only hotel details from /v3.0/data/hotel. Fetched on demand
// when the detail drawer opens (in parallel with rates). Pricing lives in
// HotelRates, not here.
export type HotelImage = { url: string; caption: string | null };
export type HotelPolicy = { title: string | null; description: string };

export type HotelDetails = {
  hotelId: string;
  name: string | null;
  description: string | null;
  importantInfo: string | null;
  videoUrl: string | null;
  images: HotelImage[];
  facilities: string[];
  checkinTime: string | null;
  checkoutTime: string | null;
  chain: string | null;
  hotelType: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  parking: boolean | null;
  petsAllowed: boolean | null;
  childAllowed: boolean | null;
  policies: HotelPolicy[];
};

export async function getHotelDetails(hotelId: string): Promise<HotelDetails> {
  const res = await apiFetch(
    `/api/trip/hotels/${encodeURIComponent(hotelId)}/details`,
    { method: "GET" },
  );
  if (!res.ok) throw await readError(res);
  return res.json();
}

export type NearestAirport = {
  id: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  iataCode: string;
};

export async function getNearestAirport(lat: number, lng: number): Promise<NearestAirport> {
  const res = await fetch(`/api/trip/nearest-airport?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function parsePrompt(prompt: string): Promise<Intuition[]> {
  const res = await apiFetch("/api/trip/parse", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw await readError(res);
  const data: BackendParseResponse = await res.json();
  return data.segments.map(toIntuition);
}
