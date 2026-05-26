import { Destination } from "./data";
import { useAuthStore } from "./authStore";

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

export type NearestAirport = {
  name: string;
  formattedAddress: string;
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
