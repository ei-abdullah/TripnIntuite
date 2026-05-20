# Duffel API Reference — Flights, Stays & Cars

> Comprehensive developer reference compiled from the Duffel documentation.
> Covers: Flights (Search, Book, Manage, Airline Credits), Stays, and Cars.

---

# PART 1 — FLIGHTS

## 1. Authentication & Setup

All requests must include:
```
Authorization: Bearer YOUR_DUFFEL_ACCESS_TOKEN
Duffel-Version: v2
Content-Type: application/json
```

Use **test tokens** (prefixed `duffel_test_`) during development. Switch to **live tokens** (`duffel_live_`) for production.

---

## 2. Search

### 2.1 Getting Started with Flights

**Core Flow:**
1. Create an **Offer Request** → get back a list of **Offers**
2. Select an Offer → create an **Order** (booking)

**Step 1 — Create an Offer Request**
`POST /air/offer_requests`

```json
{
  "data": {
    "slices": [
      {
        "origin": "LHR",
        "destination": "JFK",
        "departure_date": "2024-06-01"
      }
    ],
    "passengers": [
      { "type": "adult" }
    ],
    "cabin_class": "economy",
    "return_offers": false
  }
}
```

Key fields:
- `slices`: array of flight legs (origin/destination as IATA codes, departure_date as YYYY-MM-DD)
- `passengers`: array; each can be `{ "type": "adult" | "child" | "infant_without_seat" }` or include `age`
- `cabin_class`: `"economy"` | `"premium_economy"` | `"business"` | `"first"`
- `return_offers`: set `false` to keep offer request open for polling; `true` to return synchronously
- `max_connections`: optional integer to limit connections per slice

**Step 2 — List Offers**
`GET /air/offers?offer_request_id={id}`

Returns paginated list of offers. Each offer has:
- `id`: unique offer ID
- `total_amount` / `total_currency`
- `base_amount` / `base_currency`
- `tax_amount` / `tax_currency`
- `slices[]`: array of slice objects
- `passengers[]`
- `conditions`: fare rules (refundable, changeable etc.)
- `available_services[]`: optional ancillaries (bags, seats)
- `expires_at`: offer expiry timestamp
- `owner`: the airline object
- `partial`: boolean — if `true`, not all airlines have responded yet

**Step 3 — Get a Single Offer**
`GET /air/offers/{offer_id}`

Use before booking to refresh pricing and confirm availability.

**Step 4 — Create an Order**
`POST /air/orders`

```json
{
  "data": {
    "type": "instant",
    "selected_offers": ["off_0000A..."],
    "passengers": [
      {
        "id": "pas_0000A...",
        "title": "mr",
        "gender": "m",
        "given_name": "John",
        "family_name": "Doe",
        "born_on": "1990-01-01",
        "email": "john@example.com",
        "phone_number": "+441234567890"
      }
    ],
    "payments": [
      {
        "type": "balance",
        "currency": "GBP",
        "amount": "100.00"
      }
    ]
  }
}
```

Payment types: `"balance"` (Duffel balance), `"arc_bsp_cash"` (for IATA agents), `"card"` (requires card object).

---

### 2.2 Search Best Practices

- Always call `GET /air/offers/{offer_id}` immediately before booking to confirm the price is still valid.
- Use `return_offers: false` and poll for offers via `GET /air/offers?offer_request_id={id}&after={cursor}` for better coverage from slow airlines.
- Filter offers client-side — the API returns everything; filter by price, stops, duration etc. in your UI.
- Set `max_connections` to limit results to direct/1-stop flights.
- Cache offers client-side; they expire (check `expires_at`).
- For multi-passenger searches, all passengers share the same offer — do not create separate offer requests per passenger.
- Use `cabin_class` at the offer request level; not all airlines honour per-slice cabin class.

---

### 2.3 Choosing Your Search Response Format

Two formats:

**Synchronous (`return_offers: true`)**
- All offers returned immediately in the offer request response
- Good for simple integrations / low-traffic
- May miss slower airlines

**Asynchronous / Streaming (`return_offers: false`)**
- Offer request created; offers trickle in
- Poll `GET /air/offers?offer_request_id={id}` with pagination cursors
- The offer request `offers_count` increments as airlines respond
- Check `offer_request.offers_count` vs `offer_request.total_offers_count` to know when done
- More offers, better coverage — recommended for production

Streaming poll loop example:
1. `POST /air/offer_requests` with `return_offers: false` → get `offer_request_id`
2. Poll `GET /air/offers?offer_request_id={id}` every 500ms–1s
3. Accumulate results; stop when `offer_request.is_complete: true` or after a timeout (~10s)

---

### 2.4 Selling Split-Ticket Itineraries

Split-ticket = booking two or more separate tickets to form one itinerary (e.g., LHR→DUB on Ryanair + DUB→JFK on Aer Lingus as separate PNRs).

- Create a single offer request with multiple slices
- The API may return **partial offers** (`partial: true`) covering only some slices
- Combine compatible partial offers to form a complete itinerary
- Use `selected_offers: ["off_A", "off_B"]` (array of multiple offer IDs) in the order creation call
- Each partial offer becomes a separate ticket/PNR but is managed as one Duffel order
- Important: split tickets have no interline protection — if one flight is missed/cancelled, the other ticket is not automatically re-protected
- You must disclose to customers that these are separate tickets

**Combining offers:**
- Offers are combinable if their slices don't overlap in time
- Check `slices[].destination.datetime_local` and `slices[].origin.datetime_local` for time conflicts

---

### 2.5 Accessing Private Fares

Private (negotiated/corporate) fares are fares not available to the general public.

**Corporate fares via account code:**
```json
{
  "data": {
    "slices": [...],
    "passengers": [...],
    "cabin_class": "economy",
    "private_fares": {
      "ndc_account_codes": [
        { "airline_iata_code": "BA", "account_code": "YOUR_CORP_CODE" }
      ]
    }
  }
}
```

**Via corporate identifier / travel management:**
- Some airlines use `corporate_codes` or require specific credentials configured in Duffel dashboard
- Contact Duffel to set up private fare credentials per airline

**Response:** offers returned include `private_fares` field indicating which fare type was applied.

---

### 2.6 Adding Loyalty Programme Accounts

Pass frequent flyer / loyalty numbers so passengers earn miles.

Add to each passenger in the offer request:
```json
{
  "passengers": [
    {
      "type": "adult",
      "loyalty_programme_accounts": [
        {
          "airline_iata_code": "BA",
          "account_number": "1234567890"
        }
      ]
    }
  ]
}
```

- Multiple loyalty accounts per passenger are supported (for codeshares/alliances)
- Not all airlines support loyalty accrual via the API — check airline capabilities
- Loyalty data is passed through to the airline; validation is done by the airline
- For earning on partner airlines, include the operating airline code

---

### 2.7 Displaying Stops

Each slice in an offer contains `segments[]`. A segment = one flight leg (one take-off / one landing).

**Slice structure:**
```
slice
  └── segments[]
        ├── origin (place object: iata_code, name, city, airport)
        ├── destination (place object)
        ├── departing_at (ISO 8601 datetime)
        ├── arriving_at (ISO 8601 datetime)
        ├── operating_carrier (airline object)
        ├── marketing_carrier (airline object)
        ├── operating_carrier_flight_number
        ├── marketing_carrier_flight_number
        ├── aircraft (type)
        ├── duration (ISO 8601 duration e.g. PT2H30M)
        └── stops[] — array of technical stops (not a connection — plane lands but pax don't deplane)
              ├── airport
              ├── arriving_at
              ├── departing_at
              └── duration
```

**Connections (layovers):** between segments. Calculate layover = `next_segment.departing_at - current_segment.arriving_at`.

**Displaying stop count:** number of stops = segments.length - 1 (connections) + sum of stops[] in each segment (technical stops).

---

### 2.8 Displaying Offer and Order Conditions

Each offer and order has a `conditions` object:

```json
"conditions": {
  "change_before_departure": {
    "allowed": true,
    "penalty_amount": "50.00",
    "penalty_currency": "GBP"
  },
  "refund_before_departure": {
    "allowed": false,
    "penalty_amount": null,
    "penalty_currency": null
  }
}
```

Slice-level conditions may differ from order-level — always check both.

Fields:
- `allowed`: boolean — whether the action is permitted
- `penalty_amount`: fee to perform this action (null if not allowed or free)
- `penalty_currency`: currency of the penalty

Additional fields at offer level:
- `passenger_identity_documents_required`: boolean — whether passport/ID is needed at booking

Best practice: always surface fare conditions to customers before payment.

---

## 3. Book

### 3.1 Holding Orders and Paying Later

Some airlines support **hold** — reserve a booking without immediate payment.

**Check if hold is available:**
In the offer, check `payment_requirements.requires_instant_payment`:
- `false` → hold is available
- `true` → must pay immediately

Also check:
- `payment_requirements.price_guarantee_expires_at`: price held until this time
- `payment_requirements.payment_required_by`: must pay by this time or booking is released

**Create a held order:**
```json
POST /air/orders
{
  "data": {
    "type": "hold",
    "selected_offers": ["off_0000A..."],
    "passengers": [...]
  }
}
```

No `payments` array needed for hold orders.

**Pay for a held order:**
`POST /air/payments`
```json
{
  "data": {
    "order_id": "ord_0000A...",
    "payment": {
      "type": "balance",
      "currency": "GBP",
      "amount": "100.00"
    }
  }
}
```

---

### 3.2 Getting an Accurate Price Before Booking

Offer prices can change between search and booking. To get a guaranteed price:

**Re-fetch the offer immediately before booking:**
`GET /air/offers/{offer_id}`

This returns the latest price. Use the `total_amount` from this response for your payment.

**Order Quote (for more complex scenarios):**
`POST /air/order_quotes`

```json
{
  "data": {
    "selected_offers": ["off_0000A..."],
    "passengers": [...]
  }
}
```

Returns a `order_quote` object with a `price_locked_until` timestamp — price is guaranteed until that time.
Then create the order with `order_quote_id` instead of `selected_offers`:

```json
POST /air/orders
{
  "data": {
    "type": "instant",
    "order_quote_id": "orq_0000A...",
    "passengers": [...],
    "payments": [...]
  }
}
```

---

### 3.3 Adding Extra Bags at Booking

**Step 1 — Find available bag services on the offer:**
`GET /air/offers/{offer_id}?return_available_services=true`

Returns `available_services[]` — look for items where `type == "baggage"`.

Bag service object:
```json
{
  "id": "ase_0000A...",
  "type": "baggage",
  "total_amount": "25.00",
  "total_currency": "GBP",
  "maximum_weight_kg": 23,
  "maximum_depth_cm": 90,
  "maximum_height_cm": 72,
  "maximum_length_cm": 45,
  "passenger_ids": ["pas_0000A..."],
  "segment_ids": ["seg_0000A..."]
}
```

**Step 2 — Add bag to order creation:**
```json
POST /air/orders
{
  "data": {
    "type": "instant",
    "selected_offers": ["off_0000A..."],
    "passengers": [...],
    "services": [
      {
        "id": "ase_0000A...",
        "quantity": 1
      }
    ],
    "payments": [...]
  }
}
```

---

### 3.4 Adding Seats at Booking

**Step 1 — Get seatmap for the offer:**
`GET /air/seat_maps?offer_id={offer_id}`

Returns array of seatmap objects, one per segment. Each seatmap has:
- `cabins[]`: cabin sections (e.g., economy, business)
  - `rows[]`: each row
    - `sections[]`: left/middle/right aisle sections
      - `elements[]`: seat or aisle elements
        - `type`: `"seat"` or `"bassinet"` or `"empty"` or `"exit_row"`
        - `designator`: seat label e.g. `"14A"`
        - `available_services[]`: if seat has a service, it has an `id` and `total_amount`
        - `disclosures[]`: seat feature descriptions (e.g. "Extra legroom")
        - `conditions`: restrictions

**Step 2 — Add seat service to order:**
Same as bags — add the seat service `id` to the `services` array in `POST /air/orders`.

**Free seats:** some seats are free — they still have a service ID; include them in `services` with `quantity: 1`.

---

## 4. Manage

### 4.1 Cancelling an Order

**Check if refund is available:**
`GET /air/orders/{order_id}`
Check `conditions.refund_before_departure.allowed`.

**Get a refund quote:**
`POST /air/order_cancellations`
```json
{
  "data": {
    "order_id": "ord_0000A..."
  }
}
```

Returns an `order_cancellation` object:
- `id`: cancellation ID
- `refund_amount` / `refund_currency`
- `refund_to`: where money goes (`"original_form_of_payment"`, `"voucher"`, etc.)
- `expires_at`: how long this quote is valid

**Confirm the cancellation:**
`POST /air/order_cancellations/{order_cancellation_id}/actions/confirm`

No body needed. This is the point of no return — the order is cancelled and refund is initiated.

---

### 4.2 Changing an Order

Allows changing flights (rebooking) on a confirmed order.

**Check changeability:**
`GET /air/orders/{order_id}` → check `conditions.change_before_departure.allowed`

**Step 1 — Create a change request:**
`POST /air/order_change_requests`
```json
{
  "data": {
    "order_id": "ord_0000A...",
    "slices": {
      "remove": [
        { "slice_id": "sli_0000A..." }
      ],
      "add": [
        {
          "departure_date": "2024-07-01",
          "origin": "LHR",
          "destination": "JFK",
          "cabin_class": "economy"
        }
      ]
    }
  }
}
```

**Step 2 — List change offers:**
`GET /air/order_change_offers?order_change_request_id={id}`

Returns available new flights. Each change offer has:
- `id`
- `change_total_amount` / `change_total_currency`: net cost of the change (may be negative = refund)
- `new_total_amount`: new total order price
- `penalty_total_amount`: airline change fee
- `slices`: the new slice(s)
- `expires_at`

**Step 3 — Quote the change:**
`POST /air/order_change_quotes`
```json
{
  "data": {
    "selected_order_change_offers": ["oco_0000A..."]
  }
}
```

**Step 4 — Confirm the change:**
`POST /air/order_changes`
```json
{
  "data": {
    "order_change_quote_id": "ocq_0000A...",
    "payment": {
      "type": "balance",
      "currency": "GBP",
      "amount": "50.00"
    }
  }
}
```

If `change_total_amount` is negative (refund owed), no payment is needed.

---

### 4.3 Adding Post-Booking Bags

Add baggage to an already-confirmed order (if airline supports it).

**Step 1 — Get available services for an order:**
`GET /air/orders/{order_id}`
Check `available_services[]` on the order — filtered to services still addable post-booking.

**Step 2 — Create an order service:**
`POST /air/order_services`
```json
{
  "data": {
    "order_id": "ord_0000A...",
    "services": [
      {
        "id": "ase_0000A...",
        "quantity": 1
      }
    ],
    "payment": {
      "type": "balance",
      "currency": "GBP",
      "amount": "25.00"
    }
  }
}
```

Returns updated order with the new service added.

---

## 5. Airline Credits

Airline credits (vouchers issued by airlines for cancelled/disrupted flights) can be used as payment.

**Flow:**
1. Customer receives an airline credit/voucher directly from the airline
2. At booking, specify `"type": "airline_credit"` in the payments array

**Creating an order with airline credit:**
```json
POST /air/orders
{
  "data": {
    "type": "instant",
    "selected_offers": ["off_0000A..."],
    "passengers": [...],
    "payments": [
      {
        "type": "airline_credit",
        "airline_credit_id": "alc_0000A...",
        "currency": "GBP",
        "amount": "100.00"
      }
    ]
  }
}
```

**Redeeming partially (top-up with balance):**
Combine an `airline_credit` payment and a `balance` payment in the `payments` array. Amounts must sum to the total order price.

**Listing airline credits:**
`GET /air/airline_credits`
Filter by `passenger_id` or `airline_iata_code`.

Airline credit object:
- `id`
- `code`: the voucher code
- `airline_iata_code`
- `amount` / `currency`
- `expires_at`
- `passenger_id`
- `issuer_name`

---

# PART 2 — STAYS

## 1. Authentication

Same as Flights:
```
Authorization: Bearer YOUR_DUFFEL_ACCESS_TOKEN
Duffel-Version: v2
Content-Type: application/json
```

---

## 2. Getting Started with Stays

**Core Flow:**
1. Search → get **Accommodation** results
2. Fetch **Rates** for a property
3. Create a **Quote** (locks in price)
4. Create a **Booking**
5. Manage (cancel)

---

## 3. Searching for Stays

### 3.1 Search by Location (geographic)

`POST /stays/search`

```json
{
  "data": {
    "rooms": 1,
    "guests": [
      { "type": "adult" }
    ],
    "check_in_date": "2024-06-01",
    "check_out_date": "2024-06-05",
    "location": {
      "geographic": {
        "longitude": -0.127,
        "latitude": 51.507,
        "radius": 5000
      }
    }
  }
}
```

Key request fields:
- `rooms`: number of rooms required (integer)
- `guests[]`: array of guest objects — `{ "type": "adult" }` or `{ "type": "child", "age": 10 }`
- `check_in_date` / `check_out_date`: YYYY-MM-DD format
- `location.geographic`: lat/lng + radius in metres
- `location.place_id`: alternative — use a Duffel place ID instead of coordinates

**Response:** array of `accommodation` objects:
- `id`: accommodation ID
- `name`: hotel/property name
- `check_in_date` / `check_out_date`
- `rooms_count`: number of rooms in the result
- `cheapest_rate_total_amount` / `cheapest_rate_currency`: headline price shown in listings
- `rating`: star rating (integer 1–5)
- `location`: address, latitude, longitude
- `photos[]`: array of photo URLs
- `amenities[]`: list of amenity strings
- `accommodation_id`: the unique property identifier (use to fetch rates)
- `chain`: hotel chain info if applicable

### 3.2 Search by Accommodation ID

`POST /stays/search`

```json
{
  "data": {
    "rooms": 1,
    "guests": [{ "type": "adult" }],
    "check_in_date": "2024-06-01",
    "check_out_date": "2024-06-05",
    "location": {
      "accommodation_id": "acc_0000A..."
    }
  }
}
```

Use when you already know the property (e.g., from a previous search or a partner deep-link).

---

## 4. Fetching Rates

`GET /stays/accommodations/{accommodation_id}/rates?search_id={search_id}&rooms={n}`

Or POST to get rates directly within a search result — the search response includes a `rates` array per accommodation if `include_rates: true` in the search body.

**Rate object:**
- `id`: rate ID (use when creating a quote)
- `accommodation_id`
- `board_type`: `"room_only"` | `"breakfast"` | `"half_board"` | `"full_board"` | `"all_inclusive"`
- `total_amount` / `total_currency`
- `tax_amount` / `tax_currency`
- `fee_amount` / `fee_currency`
- `rooms[]`: room descriptions
  - `name`: room type name
  - `beds`: bed configuration
  - `photos[]`
  - `amenities[]`
- `cancellation_timeline[]`: cancellation policy windows (see Cancellation Timeline section)
- `available_payment_types[]`: e.g. `["balance"]`
- `loyalty_programme_accounts`: loyalty points earnable (if applicable)
- `supplier_name`
- `conditions`: free-text terms

---

## 5. Creating a Quote

`POST /stays/quotes`

```json
{
  "data": {
    "rate_id": "rat_0000A..."
  }
}
```

Returns a `quote` object:
- `id`: quote ID (use for booking)
- `rate`: full rate snapshot at quote time
- `accommodation`: property details snapshot
- `check_in_date` / `check_out_date`
- `total_amount` / `total_currency`: locked price
- `tax_amount` / `fee_amount`
- `expires_at`: quote expiry timestamp
- `conditions`

The quote locks in the price. Always quote immediately before booking.

---

## 6. Creating a Booking

`POST /stays/bookings`

```json
{
  "data": {
    "quote_id": "quo_0000A...",
    "guests": [
      {
        "given_name": "John",
        "family_name": "Doe",
        "born_on": "1985-06-15",
        "email": "john@example.com",
        "phone_number": "+441234567890",
        "type": "lead"
      }
    ],
    "payment": {
      "type": "balance",
      "currency": "GBP",
      "amount": "350.00"
    }
  }
}
```

Guest fields:
- `given_name` / `family_name`: required
- `type`: `"lead"` (at least one lead guest required) or `"adult"`/`"child"`
- `email`: required for lead guest
- `phone_number`: optional but recommended
- `born_on`: optional unless property requires it

Payment types:
- `"balance"`: Duffel balance
- `"card"`: requires card details

Returns a `booking` object:
- `id`: booking ID
- `reference`: confirmation reference (show to customer)
- `status`: `"confirmed"` | `"pending"` | `"cancelled"`
- `accommodation`
- `guests[]`
- `check_in_date` / `check_out_date`
- `total_amount` / `total_currency`
- `cancellation_timeline[]`
- `created_at`

---

## 7. Cancelling a Booking

`DELETE /stays/bookings/{booking_id}`

Or

`POST /stays/bookings/{booking_id}/actions/cancel`

Check `cancellation_timeline` on the booking to know if a fee applies.

Returns updated booking with `status: "cancelled"` and `refund_amount` if applicable.

---

## 8. Displaying the Cancellation Timeline

Each rate and booking has a `cancellation_timeline[]` array:

```json
"cancellation_timeline": [
  {
    "refund_amount": "350.00",
    "currency": "GBP",
    "before": "2024-05-28T00:00:00Z"
  },
  {
    "refund_amount": "0.00",
    "currency": "GBP",
    "before": null
  }
]
```

**Reading the timeline:**
- Each entry says: "if you cancel BEFORE `before` date, you get `refund_amount` back"
- The last entry (with `before: null`) is the final penalty — applies after all other windows
- Timeline is ordered chronologically
- `before: null` means "from this point onward" (no further refund)

**Display logic:**
1. Find the first entry where current time < `before`
2. Show that `refund_amount` and the `before` date as the deadline
3. If past all windows, show the last entry's amount (usually £0)

**Free cancellation:** if the first entry has `refund_amount == total_amount`, it's fully refundable until that date.

---

## 9. Loyalty Programmes (Stays)

Passengers can earn hotel loyalty points on bookings.

**Add loyalty at search time (to get loyalty rates):**
```json
POST /stays/search
{
  "data": {
    ...,
    "loyalty_programme_accounts": [
      {
        "programme": "hilton_honors",
        "account_number": "1234567890"
      }
    ]
  }
}
```

Supported programmes vary — check the Duffel dashboard / docs for current list.

**At booking:** loyalty account can also be passed in the guests array or booking body to ensure points are credited.

**Rates with loyalty:** the rate object shows `loyalty_programme_points_earned` if applicable.

---

## 10. Negotiated / Corporate Rates

Corporate clients can access negotiated (discounted) rates.

**Enable negotiated rates in search:**
```json
POST /stays/search
{
  "data": {
    ...,
    "corporate_codes": [
      {
        "chain_code": "HH",
        "code": "CORP123"
      }
    ]
  }
}
```

- `chain_code`: the hotel chain (e.g., `"HH"` = Hilton, `"MC"` = Marriott)
- `code`: your corporate account code
- Returns rates with `rate_type: "negotiated"` alongside public rates
- Negotiated rates typically have lower prices and/or better cancellation policies
- Corporate codes are configured in your Duffel account / per chain by Duffel team

---

## 11. Test Hotels

Duffel provides test accommodations for sandbox testing.

**Finding test properties:**
Search in the sandbox with any valid coordinates — specific test coordinates return predictable test properties.

**Recommended test coordinates:**
- London: `latitude: 51.5074, longitude: -0.1278`
- New York: `latitude: 40.7128, longitude: -74.0060`

**Test property names & behaviors:**

| Property Name Pattern | Behavior |
|---|---|
| Contains `"Successful"` | Booking completes normally |
| Contains `"Card Declined"` | Payment fails |
| Contains `"Cancellable"` | Booking is fully refundable |
| Contains `"Non-refundable"` | No refund on cancellation |
| Contains `"Pending"` | Booking stays in pending status (async) |
| Contains `"Timeout"` | Simulates a slow/timeout response |

**Key test behaviours:**
- Use Duffel test tokens for all sandbox testing
- Test bookings do not incur real charges
- Test hotel confirmations arrive instantly; production may be async
- Use webhook testing to simulate async booking confirmation

---

# PART 3 — CARS

## 1. Authentication

Same header pattern:
```
Authorization: Bearer YOUR_DUFFEL_ACCESS_TOKEN
Duffel-Version: v2
Content-Type: application/json
```

---

## 2. Getting Started with Cars

**Core Flow:**
1. **Search** → get a list of car offers
2. **Quote** a specific car offer (locks price)
3. **Book** using the quote
4. **Manage** (cancel if needed)

Duffel Cars aggregates offers from multiple car rental suppliers.

---

## 3. Step 1 — Search for Cars

`POST /cars/search`

```json
{
  "data": {
    "pickup_location": {
      "iata_airport_code": "LHR"
    },
    "dropoff_location": {
      "iata_airport_code": "LHR"
    },
    "pickup_date": "2024-06-01",
    "pickup_time": "10:00",
    "dropoff_date": "2024-06-05",
    "dropoff_time": "10:00",
    "drivers": [
      { "type": "adult", "age": 30 }
    ]
  }
}
```

Key fields:
- `pickup_location` / `dropoff_location`: can use `iata_airport_code` or `latitude`+`longitude`+`radius`
- `pickup_date` / `pickup_time` / `dropoff_date` / `dropoff_time`: date in YYYY-MM-DD, time in HH:MM (24h)
- `drivers[]`: at minimum the primary driver's age (affects pricing and young driver surcharges)
- One-way rentals: use different pickup and dropoff locations

**Response:** `car_search` object with:
- `id`: search ID
- `offers[]`: array of car offer objects

**Car offer object:**
- `id`
- `vehicle`:
  - `name`: e.g. `"Toyota Yaris or similar"`
  - `type`: ACRISS category code (e.g. `"ECMR"`)
  - `image_url`
  - `passenger_capacity`
  - `baggage_capacity`
  - `doors`
  - `transmission`: `"automatic"` | `"manual"`
  - `air_conditioning`: boolean
- `supplier`:
  - `name`: e.g. `"Hertz"`
  - `logo_lockup_url`
- `pickup_location` / `dropoff_location`:
  - `name`, `address`, `latitude`, `longitude`
  - `terminal` (if airport)
  - `opening_hours[]`
- `pickup_date_time` / `dropoff_date_time`: ISO 8601 with local tz
- `total_amount` / `total_currency`
- `tax_amount` / `tax_currency`
- `rate_per_day_amount` / `rate_per_day_currency`
- `conditions`:
  - `refund_before_pickup.allowed` (boolean) — free cancellation before pickup?
  - `mileage`: `"unlimited"` or a number
  - `fuel_policy`: e.g. `"full_to_full"`
- `included_extras[]`: list of already-included items (e.g., GPS, child seat)
- `available_extras[]`: optional extras that can be added (with `id`, `name`, `total_amount`)
- `rate_class`: ACRISS category
- `expires_at`

---

## 4. Step 2 — Quote a Car Offer

`POST /cars/quotes`

```json
{
  "data": {
    "offer_id": "car_off_0000A..."
  }
}
```

Returns a `car_quote` object:
- `id`: quote ID
- `offer`: full offer snapshot
- `total_amount` / `total_currency`: price locked in
- `expires_at`

Always quote immediately before booking to get a locked price.

---

## 5. Step 3 — Book a Car

`POST /cars/bookings`

```json
{
  "data": {
    "quote_id": "car_quo_0000A...",
    "driver": {
      "title": "mr",
      "given_name": "John",
      "family_name": "Doe",
      "born_on": "1990-01-15",
      "email": "john@example.com",
      "phone_number": "+441234567890",
      "licence_issued_at_country_code": "GB"
    },
    "additional_drivers": [],
    "payment": {
      "type": "balance",
      "currency": "GBP",
      "amount": "200.00"
    }
  }
}
```

Driver required fields:
- `given_name`, `family_name`
- `born_on`: YYYY-MM-DD (for age verification, young driver surcharges)
- `email`
- `phone_number`
- `licence_issued_at_country_code`: ISO 2-letter country code where licence was issued

Payment types: `"balance"`

Returns `car_booking` object:
- `id`
- `reference`: confirmation code (show to customer)
- `status`: `"confirmed"` | `"pending"` | `"cancelled"`
- `driver`
- `vehicle`
- `supplier`
- `pickup_location` / `dropoff_location`
- `pickup_date_time` / `dropoff_date_time`
- `total_amount` / `total_currency`
- `created_at`
- `voucher_url`: URL to download the rental voucher PDF (provide to customer)

---

## 6. Cancelling a Car Booking

`DELETE /cars/bookings/{booking_id}`

or

`POST /cars/bookings/{booking_id}/actions/cancel`

Check `conditions.refund_before_pickup.allowed` on the offer before attempting cancellation.

Returns updated booking with `status: "cancelled"`.

---

## 7. Testing with Duffel Test Drive

**Duffel Test Drive** is the sandbox testing tool for Cars. Use test tokens.

**Search coordinates for test data:**
Use latitude `-24.38` and longitude `-128.32` to get predictable test car offers.

```json
POST /cars/search
{
  "data": {
    "pickup_location": {
      "latitude": -24.38,
      "longitude": -128.32,
      "radius": 10000
    },
    "dropoff_location": {
      "latitude": -24.38,
      "longitude": -128.32,
      "radius": 10000
    },
    "pickup_date": "2024-06-01",
    "pickup_time": "10:00",
    "dropoff_date": "2024-06-05",
    "dropoff_time": "10:00",
    "drivers": [{ "type": "adult", "age": 30 }]
  }
}
```

**Test scenario selection:**
The test scenario is determined by the **`vehicle.name`** field in the returned offers. Filter/select the offer with the vehicle name matching your desired test scenario:

| Vehicle Name Contains | Scenario | Booking Status | Notes |
|---|---|---|---|
| `"Successful Postpaid"` | Normal postpaid booking | `confirmed` | Standard happy path |
| `"Rate Unavailable"` | Offer not available at booking | Error | Quoting/booking returns rate_unavailable error |
| `"payment_declined"` | Payment failure | Error | Payment is declined at booking |
| `"Async Confirm"` | Booking confirmed via webhook | `pending` → `confirmed` | Initial status is pending; webhook fires to confirm |
| `"Async Cancel"` | Booking cancelled via webhook | `pending` → `cancelled` | Booking is cancelled asynchronously |
| `"Supplier Timeout"` | Supplier doesn't respond | Error/Timeout | Simulates slow supplier |

**Webhook testing (async scenarios):**
- Set up a webhook endpoint in the Duffel dashboard for `car_booking.confirmed` and `car_booking.cancelled` events
- When you book an async scenario, you receive `status: "pending"`
- Duffel fires the webhook after a short delay (simulating supplier async callback)
- Your system must handle: updating booking status from webhook payload

**Webhook payload structure:**
```json
{
  "data": {
    "api_version": "v2",
    "created_at": "2024-06-01T10:00:00Z",
    "events": [
      {
        "id": "eve_0000A...",
        "type": "car_booking.confirmed",
        "object": {
          // full car_booking object
        }
      }
    ]
  }
}
```

---

---

# QUICK REFERENCE — ENDPOINT CHEAT SHEET

## Flights
| Action | Method | Endpoint |
|---|---|---|
| Create offer request | POST | `/air/offer_requests` |
| List offers | GET | `/air/offers?offer_request_id={id}` |
| Get single offer | GET | `/air/offers/{offer_id}` |
| Get offers + available services | GET | `/air/offers/{offer_id}?return_available_services=true` |
| Get seatmap | GET | `/air/seat_maps?offer_id={offer_id}` |
| Create order quote | POST | `/air/order_quotes` |
| Create order (book) | POST | `/air/orders` |
| Get order | GET | `/air/orders/{order_id}` |
| Pay for held order | POST | `/air/payments` |
| Cancel order (get quote) | POST | `/air/order_cancellations` |
| Confirm cancellation | POST | `/air/order_cancellations/{id}/actions/confirm` |
| Create change request | POST | `/air/order_change_requests` |
| List change offers | GET | `/air/order_change_offers?order_change_request_id={id}` |
| Create change quote | POST | `/air/order_change_quotes` |
| Confirm order change | POST | `/air/order_changes` |
| Add post-booking service | POST | `/air/order_services` |
| List airline credits | GET | `/air/airline_credits` |

## Stays
| Action | Method | Endpoint |
|---|---|---|
| Search accommodations | POST | `/stays/search` |
| Get rates for accommodation | GET | `/stays/accommodations/{id}/rates` |
| Create quote | POST | `/stays/quotes` |
| Create booking | POST | `/stays/bookings` |
| Get booking | GET | `/stays/bookings/{booking_id}` |
| Cancel booking | POST | `/stays/bookings/{booking_id}/actions/cancel` |

## Cars
| Action | Method | Endpoint |
|---|---|---|
| Search car offers | POST | `/cars/search` |
| Create quote | POST | `/cars/quotes` |
| Create booking | POST | `/cars/bookings` |
| Get booking | GET | `/cars/bookings/{booking_id}` |
| Cancel booking | POST | `/cars/bookings/{booking_id}/actions/cancel` |

---

# IMPORTANT RULES & GOTCHAS

## Flights
- **Always re-fetch the offer** (`GET /air/offers/{id}`) immediately before booking — prices change.
- **Offer expiry:** check `expires_at` on offers; expired offers cannot be booked.
- **Passenger IDs:** the `passengers[]` in the order must use the `id` values returned in the offer request response.
- **Hold orders:** not all airlines support hold. Always check `payment_requirements.requires_instant_payment`.
- **Split tickets:** disclose to customers. No interline protection.
- **Conditions are per-slice AND per-order** — check both levels.
- **Loyalty numbers** are passed at offer request time (not at booking) to get the right fares.
- **Post-booking services** (bags) depend on airline support — not always available.

## Stays
- **Always create a quote** before booking — it locks the price and provides the quote ID.
- **Cancellation timeline** — read from booking object (not just rate), as it reflects confirmed policy.
- **Lead guest** must be specified (`"type": "lead"`) in the guests array.
- **Search by accommodation_id** when you know the property to get targeted rates.
- **Negotiated rates** require corporate codes to be configured per chain.

## Cars
- **Driver licence country** is required — different from nationality.
- **Young driver surcharges** may apply for drivers under 25 — reflected in the offer price.
- **Voucher URL** should be provided to the customer — it's needed at the rental counter.
- **Test environment:** use coordinates `(-24.38, -128.32)` to get test offers.
- **Async bookings:** handle `pending` status and process webhooks for final status.
- **Fuel policy** (`full_to_full`, `full_to_empty`, etc.) is critical info for customers.

---

*Generated from Duffel API Documentation — Flights, Stays & Cars sections.*
*Reference date: May 2026*
