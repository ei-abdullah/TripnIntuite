# Majestor

An AI-driven travel planner. User types a **vibe** (not a destination); a multi-agent system breaks it into intuitions, finds real locations matching each, then assembles a bookable itinerary with flights, hotels, and sites.

---

## The intended app flow (the whole vision)

### 1. "Type a vibe, not a destination" — Home (`/`)

User lands on a minimal page with one input. They don't type "Tokyo" — they type **"two weeks of warm sunsets, cheap street food, and one big hike in the middle."**

### 2. "AI breaks your vibe into intuitions" — still on `/`

The **Coordinator agent** splits the prompt into 2–4 **segments** (intuitions):

- "warm sunsets" → segment 1
- "cheap street food" → segment 2
- "one big hike" → segment 3

For each segment, the **LocationFinder agent** runs in parallel and returns **3 real destinations** matching that intuition.

### 3. "Pick a destination per intuition" — `/select`

Cards grouped by intuition. User clicks one card per group → those become their **chosen legs**.

### 4. "When and how long?" — `/plan`

A small form:

- Departure date
- Days at each leg (steppers)
- Home airport

The page shows a computed timeline: "Arrive in Lisbon 12 Jun, fly to Marrakech 15 Jun, …"

### 5. "Build my full trip" — backend assembles

Single call to `POST /api/trip/plan` triggers a parallel fanout:

- **Sites agent** finds attractions per leg (Anthropic Haiku — cheap, fast)
- **Hotel service** searches LiteAPI per leg
- **Flight service** does one Duffel multi-city search for the whole chain

All in parallel, joined, returned as one big `TripPlanResponse`.

### 6. "Here's your trip" — `/trip`

Sequential leg cards:

- Leg header with dates
- **Inbound flight** (airline, price, time)
- **Top 3 hotels** with photos, stars, price, refundable badge
- **Sites** to visit (categorized)
- **Map** of the leg

### 7. "Book it" — booking modal

Click a hotel → guest info modal → sandbox booking → confirmation code shown live during the demo.

**The differentiation:** _"AI imagines your trip from a feeling"_ — not another search box. The hotel/flight/site stuff is the _payoff_ that proves the AI's suggestions are real and bookable.

---

## Multi-agent fanout (how it actually works today)

`CoordinatorService.parseAndFindAll(prompt)`:

1. **Coordinator agent runs once** — takes the full prompt, returns N segments (one per distinct location-intuition).
2. **One LocationFinder agent per segment, in parallel** — each is annotated `@Async`, joined via `CompletableFuture.allOf(...).join()`.

### Applied to the example: _"desert with population and greenery, then snowy mountains for the northern lights"_

```
Coordinator (1 agent call)
   │
   ├── segment[0]: "desert with population and greenery"
   └── segment[1]: "snowy mountains with northern lights"
        │
        ▼  fanout (parallel)
   ┌─────────────────────────────┐ ┌─────────────────────────────┐
   │ LocationFinder agent #1     │ │ LocationFinder agent #2     │
   │ input: segment[0]           │ │ input: segment[1]           │
   │ returns 3 real locations    │ │ returns 3 real locations    │
   │ (Marrakech, Jaisalmer,      │ │ (Tromsø, Reykjavík,         │
   │  Riyadh outskirts)          │ │  Yellowknife)               │
   └─────────────────────────────┘ └─────────────────────────────┘
        │                                │
        └────────────────┬───────────────┘
                         ▼
            CompletableFuture.allOf().join()
                         │
                         ▼
            ParseResponse { prompt, segments: [
              { segment[0], locations: [...3] },
              { segment[1], locations: [...3] }
            ]}
```

**Total LLM calls** for this example: 1 coordinator + 2 LocationFinders = 3. Number of LocationFinder agents = number of segments the Coordinator finds. Not fixed.

When we add Sites/Hotels/Flights later, they'll follow the **same shape**: one orchestrator decides what to fan out, then `@Async` workers run in parallel and we join the results.

---

## Phase 0 — Where we are today

| Status | Item                                                               |
| ------ | ------------------------------------------------------------------ |
| ✅     | Coordinator agent (parses prompt → segments)                       |
| ✅     | LocationFinder agent (3 destinations per segment, parallel fanout) |
| ✅     | `POST /api/trip/parse` returning `ParseResponse`                   |
| ✅     | Frontend home → `/select` page showing cards grouped by intuition  |
| ✅     | Next.js proxy to Spring Boot, no CORS needed                       |
| ❌     | Sites per location — no agent yet                                  |
| ❌     | Selection persistence between `/select` and `/plan`                |
| ❌     | Date/duration UI on `/plan`                                        |
| ❌     | Hotels — no integration                                            |
| ❌     | Flights — no integration                                           |
| ❌     | Final itinerary page — mocked                                      |
| ❌     | Booking — non-existent                                             |

### Tech stack

- **Backend:** Spring Boot 4.0.6 + Java 21 + Spring AI 2.0.0-M6
- **Frontend:** Next.js 16 (App Router) with rewrites proxying `/api/:path*` → `http://localhost:8080/api/:path*`
- **Models:** `claude-opus-4-7` (agents), `claude-haiku-4-5-20251001` (cheap helpers)
- **External APIs:** LiteAPI v3 (hotels), Duffel (flights, test mode), Anthropic (LLM), Mapbox (maps)

### Spring AI gotchas (already solved)

- `ChatClient.Builder.defaultOptions(AnthropicChatOptions.builder().model("..."))` — pass the **Builder**, not built options.
- Temperatures in `AgentConfig.java` remain commented out (per user intent).
- Structured output via Java records + Jackson `@JsonPropertyDescription` + `.entity(Class.class)`.

---

## LiteAPI integration — verified from the Postman collection

Source of truth: `reference/LiteAPI v3.postman_collection.json` (committed to repo).

### Auth

- Header: `X-API-Key: {{apiKey}}` (NOT Bearer)
- Single base URL for all endpoints

### The 4-call flow

```
GET  {{baseUrl}}/data/hotels
     ?countryCode=US&cityName=...&latitude=...&longitude=...
     &distance=10000  (meters, min 1000)
     &limit=1000 &offset=0 &timeout=1.5
  Returns: { data: [{ id, name, hotelDescription, currency, country, city,
                      latitude, longitude, address, zip, main_photo, stars }],
             hotelIds: "id1,id2,id3", total: N }

POST {{baseUrl}}/hotels/rates
  Body: { hotelIds: [...] (up to 200),
          occupancies: [{ adults: 2, children: [5,2] }],
          currency: "USD", guestNationality: "US",
          checkin: "YYYY-MM-DD", checkout: "YYYY-MM-DD",
          timeout: 5, roomMapping: true }
  Returns: { data: [{ hotelId,
                     roomTypes: [{ roomTypeId, offerId, supplier, supplierId,
                                   rates: [{ rateId, occupancyNumber, name,
                                             maxOccupancy, adultCount, childCount,
                                             boardType (RO/BB/...), boardName, remarks,
                                             priceType, commission: [{amount,currency}],
                                             retailRate: { total: [{amount,currency}],
                                                           msp: [...],
                                                           taxesAndFees: [{included,description,amount,currency}] },
                                             cancellationPolicies: { cancelPolicyInfos: [{cancelTime,amount,currency,type,timezone}],
                                                                     hotelRemarks: [],
                                                                     refundableTag: "RFN" } }] }] }] }

POST {{baseUrl}}/rates/prebook?timeout=30
  Body: { offerId, usePaymentSdk: true }
  Returns: { prebookId, ... }

POST {{baseUrl}}/rates/book
  Body: { prebookId,
          holder: { firstName, lastName, email },
          guests: [{ occupancyNumber, firstName, lastName, email, remarks }],
          payment: { method: "TRANSACTION_ID"|"ACC_CREDIT_CARD"|"WALLET"|"NONE",
                     transactionId } }
  Returns: { bookingId, confirmationCode, status: "confirmed", ... }
```

Sandbox payment methods (`ACC_CREDIT_CARD` or `NONE`) enable real-feeling booking without real charges — ideal for live demo.

### Pending clarifications

- Confirm LiteAPI sandbox URL — is it `https://api.sandbox.liteapi.travel/v3.0` or the same URL with a sandbox key?

---

## LiteAPI prebuilt widgets (the shortcut)

LiteAPI also ships three drop-in JS widgets that share the same SDK and use a **WhiteLabel domain** (`example.nuitee.link`) instead of an API key for auth. They accept a Google **`placeId`** (not lat/lng) to scope the search.

| Widget          | What it is                                                     | Drop-in cost |
| --------------- | -------------------------------------------------------------- | ------------ |
| **Search Bar**  | Date/destination input that deep-links to your WhiteLabel site | 5 min        |
| **Hotels List** | Full hotel cards with photos, prices, filters, paging          | 5 min        |
| **Map**         | Interactive map with hotel pins, search overlay                | 5 min        |

Shared script tag: `https://components.liteapi.travel/v1.0/sdk.umd.js`

### Example: Hotels List widget

```html
<script src="https://components.liteapi.travel/v1.0/sdk.umd.js"></script>
<div id="hotels-list"></div>
<script>
  LiteAPI.init({ domain: "whitelabel.nuitee.link" });
  LiteAPI.HotelsList.create({
    selector: "#hotels-list",
    placeId: "ChIJdd4hrwug2EcRmSrV3Vo6llI",
    primaryColor: "#7057F0",
    hasSearchBar: true,
    rows: 2,
  });
</script>
```

They handle photos, prices, refundability badges, dates, guests, **and the entire booking checkout via the WhiteLabel site.**

### Catch: widgets want a `placeId`, our agent returns `name + lat/lng`

- **Easiest:** add `placeId` to the LocationFinder's output schema and let the LLM generate it (well-known place IDs). Risk: hallucination.
- **Safer:** call Google Places Find Place API or Mapbox geocoding to convert `name+country` → `placeId`. ~10 min of work.

---

## Three ways forward

**Option A — Widget-first (fastest, most demo-able)**
Skip the LiteAPI Java integration entirely. Use the Hotels List widget inside each leg card on `/trip`, with date/guest params from `/plan`. Booking happens on the WhiteLabel site.

- Hours saved: ~3.5
- Trade: hotels feel "embedded" rather than woven into the AI narrative

**Option B — Hybrid (RECOMMENDED)**
Still call the LiteAPI Java client to fetch a top-3 hotels preview per leg (so the AI itinerary shows curated picks alongside flights and sites — feels cohesive). "Book" button opens a modal containing the Hotels List widget pre-scoped to that location. WhiteLabel handles checkout.

- Hours saved: ~1
- Best of both — AI-curated preview + frictionless real booking

**Option C — Pure API (original plan)**
Hand-roll everything. Hotels feel native and fully integrated, but you build the checkout UI yourself.

- Hours saved: 0
- Most polished but most work

---

## Phased implementation plan

### Phase 1 — Sites Recommender agent _(~30 min)_

The cheapest third agent. Runs alongside hotels and flights when assembling the plan.

**New files**

- `apps/api/src/main/java/com/abdullah/api/model/sites/SitesRecommendation.java` — record `{ locationId, sites: List<Site> }`, `Site = { name, description, category }`
- `apps/api/src/main/java/com/abdullah/api/service/SitesRecommenderService.java` — `@Async findSites(locationName, country, keywords) → CompletableFuture<SitesRecommendation>`

**Edits**

- `AgentConfig.java` — add `sitesRecommenderAgent` ChatClient bean using `claude-haiku-4-5-20251001`

### Phase 2 — LiteAPI Hotel client _(~1.5 hr)_

**New files**

- `apps/api/src/main/java/com/abdullah/api/model/hotel/Hotel.java`
- `apps/api/src/main/java/com/abdullah/api/model/hotel/HotelRatesRequest.java`
- `apps/api/src/main/java/com/abdullah/api/model/hotel/HotelRatesResponse.java` (nested: `RatedHotel`, `RoomType`, `Rate`, `RetailRate`, `CancellationPolicies`, `Money`)
- `apps/api/src/main/java/com/abdullah/api/model/hotel/PrebookRequest.java` / `PrebookResponse.java`
- `apps/api/src/main/java/com/abdullah/api/model/hotel/BookRequest.java` / `BookingConfirmation.java`
- `apps/api/src/main/java/com/abdullah/api/client/LiteApiClient.java` — Spring `RestClient`, `X-API-Key` header, 4 methods:
  - `searchHotels(lat, lng, countryCode, distanceMeters, limit)`
  - `getRates(HotelRatesRequest)`
  - `prebook(offerId)`
  - `book(BookRequest)`

**Edits**

- `application.yaml` — add:
  ```yaml
  liteapi:
    api-key: ${LITEAPI_API_KEY}
    base-url: https://api.liteapi.travel/v3.0
  ```

**Env**

- `LITEAPI_API_KEY`

### Phase 3 — HotelService (search + select top N) _(~45 min)_

**New file**

- `apps/api/src/main/java/com/abdullah/api/service/HotelService.java`
  - `@Async findHotelsForLeg(double lat, double lng, String countryCode, LocalDate checkin, LocalDate checkout, int adults) → CompletableFuture<List<HotelOffer>>`
  - Internally: `searchHotels()` → take top 10 by stars/rating → `getRates()` → pick best 3 rates → map to `HotelOffer`
- `apps/api/src/main/java/com/abdullah/api/model/hotel/HotelOffer.java` — frontend-friendly flattened DTO

### Phase 4 — Timeline calculator _(~30 min)_

**New file**

- `apps/api/src/main/java/com/abdullah/api/service/TimelineCalculator.java`
  - Input: `LocalDate departureDate`, `List<LegInput> legs (locationId, stayDays)`
  - Output: `List<DatedLeg> { locationId, arrivalDate, departureDate, stayDays }` + final return-home date

### Phase 5 — Duffel Flights client _(~1.5 hr)_

**New files**

- `apps/api/src/main/java/com/abdullah/api/model/flight/FlightOffer.java`, `Slice.java`, `Segment.java`
- `apps/api/src/main/java/com/abdullah/api/client/DuffelClient.java` — `RestClient`, `Authorization: Bearer`, `Duffel-Version: v2`
  - `createOfferRequest(List<SliceInput>, int adults)` with `?return_offers=true&supplier_timeout=15000`
- `apps/api/src/main/java/com/abdullah/api/service/FlightService.java`
  - `searchMultiCity(homeAirport, List<DatedLeg with airports>)` → returns per-slice top 3 offers

**Env**

- `DUFFEL_ACCESS_TOKEN`

### Phase 6 — TripPlannerService (the assembler) _(~1 hr)_

The fanout point. Hotel search + sites per leg in parallel; one flight search for the whole multi-city request.

**New file**

- `apps/api/src/main/java/com/abdullah/api/service/TripPlannerService.java`
  - Input: `TripPlanRequest { homeAirport, departureDate, legs: [{ locationId, name, country, nearestAirport, lat, lng, stayDays }] }`
  - Steps:
    1. `TimelineCalculator.compute(...)` → dated legs
    2. Parallel per leg → `hotelService.findHotelsForLeg(...)` + `sitesRecommenderService.findSites(...)`
    3. In parallel with (2): `flightService.searchMultiCity(...)`
    4. `CompletableFuture.allOf(...).join()`
    5. Assemble `TripPlanResponse { legs: [{ legNumber, location, dates, inboundFlight, hotels, sites }], returnFlight }`

**New file**

- `apps/api/src/main/java/com/abdullah/api/model/plan/TripPlanRequest.java` + `TripPlanResponse.java` + nested `PlannedLeg.java`

### Phase 7 — `/api/trip/plan` endpoint _(~15 min)_

**Edit**

- `TripController.java` — add `@PostMapping("/plan")` delegating to `TripPlannerService.plan(...)`.

### Phase 8 — Booking endpoint _(~30 min)_

**Edit**

- `TripController.java`:
  - `POST /api/trip/book/hotel` — body `{ offerId, holder, guests }` → returns `BookingConfirmation`
- **New** in `HotelService.java`: `prebookAndBook(offerId, holder, guests)` chains the two calls.

Sandbox uses `payment.method = "ACC_CREDIT_CARD"` or `"NONE"` — no real charge.

### Phase 9 — Frontend: selection state _(~45 min)_

**New file**

- `apps/web/app/lib/tripStore.ts` — Zustand store holding `{ prompt, intuitions, selections: Map<segmentIdx, locationId>, departureDate, stayDays: Map<locationId, number>, plan: TripPlanResponse | null }`

**Edits**

- `apps/web/app/select/page.tsx` — on card click, store the selection, "Continue" button → router.push("/plan")
- `apps/web/app/TripIntuition.tsx` — write intuitions to the store after `parsePrompt` resolves

### Phase 10 — Frontend: `/plan` page (dates + durations) _(~1 hr)_

**New / edited file**

- `apps/web/app/plan/page.tsx` — departure date picker + one stepper per selected leg + computed timeline preview. Bottom button "Build itinerary" → `tripPlan(...)` → `/trip`.

**Edit**

- `apps/web/app/lib/api.ts` — add `tripPlan(req: TripPlanRequest): Promise<TripPlanResponse>` calling `POST /api/trip/plan`.

### Phase 11 — Frontend: `/trip` itinerary page _(~1.5 hr)_

**New / edited file**

- `apps/web/app/trip/page.tsx` — reads `plan` from store; renders sequential Leg cards:
  - Leg header (number, location, date range)
  - Inbound flight summary (airline, price, time)
  - Top 3 hotels (photo, stars, price/night, refundable badge, "Book" button)
  - Sites list with category icons
  - Mapbox embed centered on leg coords
- Final return-flight card

**New file** (small)

- `apps/web/app/lib/mapbox.ts` — wraps a static Mapbox embed using `MAPBOX_ACCESS_TOKEN`

### Phase 12 — Hotel booking UX _(~30 min)_

**Edit**

- `apps/web/app/trip/page.tsx` — "Book" button opens a modal with guest fields → POST `/api/trip/book/hotel` → shows confirmation code overlay.

**If Option B:** modal contains the LiteAPI Hotels List widget pre-scoped to that placeId instead.

### Phase 13 — Polish & demo prep _(~1 hr)_

- Replace picsum images on `/select` with Unsplash search by location name (or keep picsum if Unsplash dev key not ready)
- Loading skeletons on `/trip` while plan is being built
- Error states: hotel search returned zero / flight unavailable → graceful fallback
- Verify the whole flow with one canonical prompt end-to-end

---

## Data flow (end-to-end)

```
USER                         FRONTEND               BACKEND                          EXTERNAL
──────────────────────────────────────────────────────────────────────────────────────────────
type prompt ───────────────► /  ──POST /parse────► CoordinatorService             ► Anthropic
                                                     └─► LocationFinder ×N (async) ► Anthropic
                             ◄────────ParseResponse─┘
pick locations ────────────► /select  (store)
set dates ─────────────────► /plan    ──POST /plan─► TripPlannerService
                                                     ├─► Timeline (pure)
                                                     ├─► FlightService ─────────────► Duffel
                                                     ├─► HotelService ×N (async) ───► LiteAPI (×2 calls)
                                                     └─► SitesRecommender ×N (async)► Anthropic Haiku
                             ◄────────TripPlanResponse─┘
view itinerary ────────────► /trip
click "Book" ──────────────► modal    ──POST /book/hotel─► HotelService
                                                            ├─► prebook ───────────► LiteAPI
                                                            └─► book ──────────────► LiteAPI (sandbox)
                             ◄────────BookingConfirmation─┘
```

---

## File tree after all phases

```
apps/api/src/main/java/com/abdullah/api/
├── Main.java                              (existing)
├── config/AgentConfig.java                (+ sitesRecommenderAgent bean)
├── controller/TripController.java         (+ /plan, /book/hotel)
├── client/
│   ├── LiteApiClient.java                 NEW
│   └── DuffelClient.java                  NEW
├── service/
│   ├── CoordinatorService.java            (existing)
│   ├── LocationFinderService.java         (existing)
│   ├── SitesRecommenderService.java       NEW
│   ├── HotelService.java                  NEW
│   ├── FlightService.java                 NEW
│   ├── TimelineCalculator.java            NEW
│   └── TripPlannerService.java            NEW
└── model/
    ├── prompt/...                         (existing)
    ├── hotel/...                          NEW
    ├── flight/...                         NEW
    ├── sites/...                          NEW
    └── plan/...                           NEW

apps/web/app/
├── TripIntuition.tsx                      (+ writes to store)
├── lib/
│   ├── api.ts                             (+ tripPlan, bookHotel)
│   ├── tripStore.ts                       NEW
│   └── mapbox.ts                          NEW
├── select/page.tsx                        (+ selection wiring)
├── plan/page.tsx                          NEW (or rebuilt)
└── trip/page.tsx                          NEW (or rebuilt)
```

---

## Time estimate

| Phase                 | Time          |
| --------------------- | ------------- |
| 1. Sites agent        | 30m           |
| 2. LiteAPI client     | 1.5h          |
| 3. HotelService       | 45m           |
| 4. Timeline           | 30m           |
| 5. Duffel client      | 1.5h          |
| 6. TripPlannerService | 1h            |
| 7. /plan endpoint     | 15m           |
| 8. Booking endpoint   | 30m           |
| 9. Selection store    | 45m           |
| 10. /plan page        | 1h            |
| 11. /trip page        | 1.5h          |
| 12. Booking modal     | 30m           |
| 13. Polish            | 1h            |
| **Total**             | **~11 hours** |

Subtract ~3.5 hours if going with **Option A** (widget-first), or ~1 hour if going with **Option B** (hybrid).

---

## Suggested execution order

Build **backend bottom-up to a working `/plan` endpoint first** (Phases 1–7), test it with `curl`, then the frontend (Phases 9–11), then booking (Phase 8 backend + 12 frontend), then polish (13).

This way there's a working end-to-end demo by hour 6 and the rest is icing.

---

## Environment variables required

```bash
ANTHROPIC_API_KEY=...
LITEAPI_API_KEY=...
LITEAPI_WHITELABEL_DOMAIN=...   # if using widgets (Option A/B)
DUFFEL_ACCESS_TOKEN=duffel_test_...
MAPBOX_ACCESS_TOKEN=...
# Optional:
UNSPLASH_ACCESS_KEY=...
GOOGLE_PLACES_API_KEY=...       # if using widgets and resolving placeId server-side
```

Frontend `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_MAPBOX_TOKEN=...
NEXT_PUBLIC_LITEAPI_WHITELABEL_DOMAIN=...  # if using widgets
```

---

## Open decisions before starting

1. **Pick a hotel integration option** — A (widget), B (hybrid, recommended), or C (pure API).
2. **Confirm LiteAPI sandbox URL** — `https://api.sandbox.liteapi.travel/v3.0` vs same URL with sandbox key.
3. **`placeId` strategy** (if Option A/B) — let LLM generate it, or use a geocoding API.

---

## Next concrete step

**Phase 1: Sites Recommender agent.** It's the smallest piece, completes the three-agent story (Coordinator → LocationFinder → SitesRecommender), and unblocks the planner. ~30 min.
