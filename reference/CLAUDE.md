# CLAUDE.md — TripIntuition Project Context

This file contains the complete project context for TripIntuition, an AI-powered travel recommendation web app. Feed this to Claude Code so it has full awareness of the architecture, tech decisions, APIs, and implementation plan.

---

## Project Overview

TripIntuition is a web app where users describe their ideal travel destinations in natural language — without knowing specific place names. An AI multi-agent system interprets their "intuitions," finds matching real-world locations, and builds a complete multi-leg itinerary with flights and hotels, all timeline-coordinated from a single departure date.

**Tech Stack:**
- Backend: Java 21 + Spring Boot 3.4 + Spring AI (Anthropic Claude)
- Frontend: React / Next.js
- Flight + Hotel API: Duffel (https://duffel.com/docs/api/overview/welcome)
- Maps: Mapbox
- Location Images: Unsplash
- AI Provider: Anthropic Claude (via Spring AI)

---

## Complete User Flow

### Step 1 — Home Screen: Describe Your Trip
- Single prominent textarea on a clean, minimal landing page
- User types freeform natural language describing environments/vibes, NOT destination names
- Example: "I want to go somewhere with desert and mountains and some human populations, then I want to see northern lights on snowy mountains"
- One "Explore" button to submit
- While processing, show a subtle terminal-style agent activity console with live logs from Coordinator and sub-agents

### Step 2 — Coordinator Agent Parses Prompt
- Backend receives the raw prompt
- Coordinator Agent (Spring AI ChatClient) breaks it into N sub-prompts (segments)
- Example: Segment 1 = "desert and mountains with human population", Segment 2 = "northern lights on snowy mountains"
- Returns structured JSON with segments and keywords

### Step 3 — N Location Finder Agents Run Concurrently
- For each segment, a Location Finder sub-agent is spawned
- Agents run concurrently using CompletableFuture.allOf()
- Each agent finds 3-4 real-world locations matching the segment description
- Returns: name, country, nearest city, nearest airport (IATA code), lat/lng, description, match score
- Example: Agent 1 → [Petra, Sinai, Wadi Rum], Agent 2 → [Tromsø, Rovaniemi, Abisko]
- The number of agents is DYNAMIC — 1 intuition = 1 agent, 5 intuitions = 5 agents

### Step 4 — User Selects One Location Per Segment
- Frontend shows cards grouped by intuition segment
- Each card has: image, location name, country, city, match %, description
- User picks one per group
- Example: User picks Petra for desert, Abisko for northern lights

### Step 5 — User Sets Stay Duration + Departure Date
- For each selected location, user sets days of stay (e.g., 3 days in Petra, 4 days in Abisko)
- User sets ONE date: departure from home
- ALL other dates are auto-calculated from departure + stay durations
- Timeline auto-chains: Home → Petra (3 days) → Abisko (4 days) → Home

### Step 6 — System Fetches Flights + Hotels + Sites
- Flights: Duffel API — searches for each leg based on computed timeline
- Hotels: Duffel Stays API — searches by lat/lng + check-in/check-out dates
- Sites: AI agent recommends 4-6 attractions per location

### Step 7 — Display as "Legs"
- Final itinerary shown as sequential Leg cards
- Each Leg contains:
  - Leg number + location name + date range
  - ✈️ Flight: route, airline options with price and duration
  - 🏨 Hotels: name, stars, rating, price/night, photo
  - 📍 Sites to visit: AI-recommended attractions
  - 🗺️ Map: embedded Mapbox map centered on location
- After all legs, a Return Flight card (last destination → home)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Next.js)                  │
│                                                                  │
│  Home Page ──→ Location Selection ──→ Duration/Date ──→ Legs     │
│  (Prompt)       (Cards per segment)    (Per location)   (Final)  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SPRING BOOT BACKEND                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              COORDINATOR AGENT (Spring AI)               │     │
│  │  - Receives raw user prompt                              │     │
│  │  - Parses into N sub-prompts                             │     │
│  │  - Delegates to N Location Finder sub-agents             │     │
│  └────────────┬────────────┬────────────┬──────────────────┘     │
│               │            │            │  (concurrent)          │
│               ▼            ▼            ▼                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Location     │ │ Location     │ │ Location     │            │
│  │ Finder       │ │ Finder       │ │ Finder       │            │
│  │ Agent 1      │ │ Agent 2      │ │ Agent N      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │             TRIP PLANNER SERVICE                         │     │
│  │  - Calculates timeline from departure date + durations   │     │
│  │  - Calls Duffel Flights API                              │     │
│  │  - Calls Duffel Stays API                                │     │
│  │  - Assembles Legs                                        │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │             SITES RECOMMENDER AGENT                      │     │
│  │  - For each selected location, suggests attractions      │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Spring AI — Multi-Agent Implementation

### Dependencies
```xml
<!-- Spring AI - Anthropic (Claude) -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-anthropic-spring-boot-starter</artifactId>
</dependency>

<!-- Spring AI Agent Utils - Sub-agent orchestration -->
<dependency>
    <groupId>org.springaicommunity</groupId>
    <artifactId>spring-ai-agent-utils</artifactId>
    <version>0.7.0</version>
</dependency>
```

Requires Spring AI BOM 1.0.0-M5+ and the Spring Milestones repository.

### Agent Architecture
- **Coordinator Agent**: ChatClient with system prompt to parse prompts into segments. Uses `.entity(ParsedSegments.class)` for structured output.
- **Location Finder Agent**: ChatClient with system prompt for geographic matching. Uses `.entity(MatchedLocations.class)`. One call per segment, all run concurrently via `CompletableFuture`.
- **Sites Recommender Agent**: ChatClient that returns `List<String>` of attraction names per location.

### Dynamic Agent Spawning
The number of sub-agents is NOT hardcoded. The Coordinator returns N segments, and we programmatically create N concurrent ChatClient calls using `CompletableFuture.allOf()` with Spring's `@Async`. 1 intuition = 1 agent, 5 intuitions = 5 agents.

### Relevant Learning Resources
- Official Spring AI Orchestrator-Workers pattern: https://docs.spring.io/spring-ai/reference/api/effective-agents.html
- Baeldung agentic patterns: https://www.baeldung.com/spring-ai-building-effective-agents
- Spring blog on TaskTool sub-agents: https://spring.io/blog/2026/01/27/spring-ai-agentic-patterns-4-task-subagents/
- spring-ai-agent-utils GitHub: https://github.com/spring-ai-community/spring-ai-agent-utils

---

## Duffel API — Flights + Hotels

### Overview
Duffel provides both Flights and Stays (hotels) through a single API. We are using TEST MODE with token starting `duffel_test_`.

Base URL: `https://api.duffel.com`
Auth: `Authorization: Bearer <DUFFEL_ACCESS_TOKEN>`
Version header: `Duffel-Version: v2`

### Flights — Key Concepts
- **Offer Request**: A search. Contains slices (legs) and passengers.
- **Slice**: One leg of the journey (origin → destination on a date). Uses IATA codes.
- **Offer**: A result — a bundle of flights at a price. Contains slices with segments.
- **Segment**: An individual flight within a slice (direct = 1 segment, layover = 2+ segments).
- **Order**: A booking created from an offer.

### Flight Search — Multi-City (Our Use Case)
We need multi-city: Home → Destination A → Destination B → Home. This is done with multiple slices in one offer request:

```bash
curl --compressed "https://api.duffel.com/air/offer_requests" \
  -H "Content-Type: application/json" \
  -H "Duffel-Version: v2" \
  -H "Authorization: Bearer duffel_test_xxx" \
  -d '{
    "data": {
      "cabin_class": "economy",
      "slices": [
        { "origin": "ISB", "destination": "AMM", "departure_date": "2026-06-10" },
        { "origin": "AMM", "destination": "KRN", "departure_date": "2026-06-13" },
        { "origin": "KRN", "destination": "ISB", "departure_date": "2026-06-17" }
      ],
      "passengers": [{ "type": "adult" }]
    }
  }'
```

Query param: `?return_offers=true&supplier_timeout=15000`

### Stays (Hotels) — Key Concepts
- **Search**: Find accommodations by lat/lng + radius, check-in/check-out dates, guests, rooms.
- **Accommodation**: The physical property (name, location, photos, amenities, star rating).
- **Room**: The room type (name, bed config, photos).
- **Rate**: The pricing and conditions (cancellation policy, board type, price).

### Stays Search Endpoint
```bash
POST https://api.duffel.com/stays/search
{
  "data": {
    "location": {
      "radius": 10,
      "geographic_coordinates": {
        "latitude": 30.3285,
        "longitude": 35.4444
      }
    },
    "check_in_date": "2026-06-10",
    "check_out_date": "2026-06-13",
    "guests": [{ "type": "adult" }],
    "rooms": 1
  }
}
```

### Test Mode Details
- Duffel Airways (IATA: ZZ) is their synthetic sandbox airline — always works but prices/schedules aren't real.
- Some real airline sandboxes are also available but can be unreliable.
- Test tokens start with `duffel_test_`.
- Sandbox balance is unlimited for testing.
- Test credit cards: `4242 4242 4242 4242` (any CVC, any future expiry).

---

## Data Models (Java Records)

### Coordinator Output — ParsedSegments
```json
{
  "segments": [
    {
      "index": 1,
      "description": "desert alongside mountains with human population",
      "keywords": ["desert", "mountains", "inhabited"]
    },
    {
      "index": 2,
      "description": "northern lights alongside snowy mountains",
      "keywords": ["aurora", "snow", "mountains"]
    }
  ]
}
```

### Sub-Agent Output — MatchedLocations
```json
{
  "segmentIndex": 1,
  "locations": [
    {
      "id": "petra",
      "name": "Petra",
      "country": "Jordan",
      "nearestCity": "Wadi Musa",
      "nearestAirport": "AMM",
      "latitude": 30.3285,
      "longitude": 35.4444,
      "description": "Ancient desert city carved into rose-red cliffs...",
      "matchScore": 0.95
    }
  ]
}
```

### Trip Plan Request (from frontend)
```json
{
  "departureDate": "2026-06-10",
  "homeAirport": "ISB",
  "legs": [
    {
      "segmentIndex": 1,
      "locationId": "petra",
      "locationName": "Petra",
      "country": "Jordan",
      "nearestAirport": "AMM",
      "latitude": 30.3285,
      "longitude": 35.4444,
      "stayDays": 3
    },
    {
      "segmentIndex": 2,
      "locationId": "abisko",
      "locationName": "Abisko",
      "country": "Sweden",
      "nearestAirport": "KRN",
      "latitude": 68.3498,
      "longitude": 18.8310,
      "stayDays": 4
    }
  ]
}
```

### Trip Plan Response (to frontend)
```json
{
  "legs": [
    {
      "legNumber": 1,
      "locationName": "Petra",
      "country": "Jordan",
      "arrivalDate": "2026-06-10",
      "departureDate": "2026-06-13",
      "stayDays": 3,
      "inboundFlight": {
        "from": "ISB",
        "to": "AMM",
        "date": "2026-06-10",
        "options": [
          { "airline": "Emirates", "flightNumber": "EK123", "price": "420.00", "currency": "USD", "duration": "PT6H15M", "departureTime": "2026-06-10T08:00", "arrivalTime": "2026-06-10T14:15" }
        ]
      },
      "hotels": [
        { "name": "Mövenpick Resort Petra", "description": "...", "rating": 4.6, "stars": 5, "pricePerNight": "145.00", "currency": "USD", "photoUrl": "https://..." }
      ],
      "sitesToVisit": ["The Treasury (Al-Khazneh)", "The Monastery (Ad-Deir)", "Siq Canyon Walk"],
      "map": { "latitude": 30.3285, "longitude": 35.4444, "mapboxToken": "pk.xxx" }
    }
  ],
  "returnFlight": {
    "from": "KRN",
    "to": "ISB",
    "date": "2026-06-17",
    "options": []
  }
}
```

---

## Backend REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/trip/parse` | Send raw prompt → returns parsed segments + matched locations (runs Coordinator + N sub-agents) |
| `POST` | `/api/trip/plan` | Send selected locations + durations + departure date → returns full trip plan with flights, hotels, sites |
| `GET` | `/api/trip/health` | Health check |

---

## Frontend Pages (React/Next.js)

| Page | Route | What It Shows |
|------|-------|---------------|
| Home | `/` | Header + textarea prompt + "Explore" button + agent console |
| Past Searches | `/past` | Grid of previous trip queries |
| Location Selection | `/select` | Cards grouped by intuition segment, user picks one per group |
| Plan Timeline | `/plan` | Departure date picker + day controls per location + auto-calculated timeline preview |
| Itinerary | `/trip` | Leg cards with flights, hotels, sites, maps + return flight card |

### Design Direction
- Minimalist, premium aesthetic inspired by Apple and Rolex
- No gradients, generous white space, strong visual hierarchy
- Restrained color palette — mostly neutrals with one accent color
- Large typography for headings, subtle dividers instead of borders
- Sharp high-resolution photography on location cards
- No shadows, no clutter
- Mobile responsive, editorial feel
- Agent activity console on home screen uses monospaced type but stays minimal and elegant

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=       # From console.anthropic.com
DUFFEL_ACCESS_TOKEN=     # From app.duffel.com (starts with duffel_test_)
MAPBOX_ACCESS_TOKEN=     # From mapbox.com
UNSPLASH_ACCESS_KEY=     # From unsplash.com/developers
```

---

## Project Structure (Backend)

```
tripintuition/
├── pom.xml
├── CLAUDE.md                          # This file
├── src/main/resources/
│   └── application.properties
└── src/main/java/com/tripintuition/
    ├── TripIntuitionApplication.java   # @SpringBootApplication @EnableAsync
    ├── config/
    │   ├── AgentConfig.java            # 3 ChatClient beans: Coordinator, LocationFinder, SitesRecommender
    │   └── AppConfig.java              # CORS, Duffel WebClient, Unsplash WebClient
    ├── client/
    │   └── DuffelClient.java           # Duffel REST: searchFlights, searchMultiCityFlights, searchStays
    ├── controller/
    │   └── TripController.java         # POST /api/trip/parse, POST /api/trip/plan
    ├── model/
    │   └── Models.java                 # All Java records: ParsedSegments, MatchedLocations, TripPlan, etc.
    └── service/
        ├── CoordinatorService.java     # Parses prompt → spins up N sub-agents via CompletableFuture
        └── TripPlannerService.java     # Timeline calc → Duffel flights → Duffel stays → AI sites
```

---

## Task Breakdown

### Backend (Spring Boot + Spring AI)
- [ ] Project setup: Spring Boot + Spring AI + spring-ai-agent-utils + Lombok
- [ ] Coordinator Agent: system prompt + structured output for segment parsing
- [ ] Location Finder Agent: system prompt + geographic knowledge + structured output
- [ ] Dynamic concurrent agent spawning (CompletableFuture per segment)
- [ ] Timeline Calculator (departure date + durations → full date chain)
- [ ] Duffel Flights integration (offer requests, multi-city, parse offers)
- [ ] Duffel Stays integration (search by coordinates, parse results)
- [ ] Sites Recommender agent (attractions per location)
- [ ] REST endpoints for frontend
- [ ] Error handling (API failures, no matching locations, timeouts)
- [ ] CORS config for React frontend

### Frontend (React/Next.js)
- [ ] Home page with prompt textarea + animated header + agent console
- [ ] Past searches page
- [ ] Location selection UI (cards grouped by segment)
- [ ] Duration + departure date form with timeline preview
- [ ] Itinerary/Legs display page with flights, hotels, sites, maps
- [ ] Mapbox integration per leg
- [ ] Unsplash image fetching for location cards
- [ ] Loading states during AI processing
- [ ] Mobile responsive layout

### Integration
- [ ] End-to-end flow: prompt → parse → select → plan → display
- [ ] Error handling across full stack
- [ ] Streaming or polling for long-running AI calls
