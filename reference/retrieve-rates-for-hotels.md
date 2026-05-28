# Retrieve Rates for Hotels

**API Category:** SEARCH → HOTEL RATES  
**Method:** `POST`  
**Endpoint:** `https://api.liteapi.travel/v3.0/hotels/rates`

---

## Overview

Search for hotel rates and availability across multiple hotels. This is the primary endpoint for finding bookable hotel rooms with real-time pricing.

### When to Use
- Display hotel listings with prices on your search results page
- Show detailed rate options for specific hotels users are viewing
- Support multi-room bookings for families or groups
- Filter hotels by location, amenities, ratings, or AI-powered semantic search

### What You Get
- Real-time rates with availability and pricing
- Multiple room options per hotel, sorted by price
- Complete booking details including cancellation policies, meal plans, and room types
- Hotel information (name, photos, address, ratings) when searching by filters

### Key Features
- **Multiple search methods:** Search by hotel IDs, city/country, coordinates, Place ID, IATA code, or natural language (AI search)
- **Flexible filtering:** Filter by star rating, facilities, hotel chains, accessibility, and more
- **Multi-room support:** Book multiple rooms with different guest configurations in one request
- **Performance optimized:** Default limit of 200 hotels (expandable to 5,000), recommended timeout of 6–12 seconds

---

## Quick Start

**Required fields:** `checkin`, `checkout`, `currency`, `guestNationality`, `occupancies`, plus **one** location method (hotel IDs, city/country, coordinates, Place ID, or IATA code).

> **Tip:** When searching by filters (like `aiSearch` or `cityName`), hotel data is automatically included. For direct hotel ID searches, set `includeHotelData=true` to include hotel names and photos.

---

## Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `accept` | string (enum) | No | Response content type. Defaults to `application/json`. Allowed values: `application/json`, `text/event-stream` |
| `X-API-Key` | string | Yes | Your liteAPI authentication key |
| `content-type` | string | Yes | Must be `application/json` |

---

## Request Body Parameters

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `occupancies` | array of objects | An array of objects specifying the number of guests per room. Each object defines a room's guest configuration. |
| `currency` | string | The currency in which the prices will be displayed (e.g., `USD`, `EUR`). |
| `guestNationality` | string | The guest's nationality in ISO 2-letter country code format (e.g., `US`, `GB`). |
| `checkin` | string | The check-in date in `YYYY-MM-DD` format (ISO 8601). |
| `checkout` | string | The check-out date in `YYYY-MM-DD` format (ISO 8601). |

> **Note:** In addition to the fields above, at least **one** of the following location methods is required: `hotelIds`, `countryCode`/`cityName`, `latitude`/`longitude`, `placeId`, `iataCode`, or `aiSearch`.

---

### Location / Search Method Fields (One Required)

| Field | Type | Description |
|-------|------|-------------|
| `hotelIds` | array of strings | An array of hotel IDs to search for availability and pricing. Usually pulled from the [data hotels endpoint](https://docs.liteapi.travel/reference/get_data-hotels). |
| `countryCode` | string | The country code in ISO 2-letter format (e.g., `SG` for Singapore). Can be used with `cityName` for a country/city search. |
| `cityName` | string | The name of the city to search for hotels in. Pairs with `countryCode`. |
| `latitude` | number | Latitude coordinate for location-based hotel searches. Pairs with `longitude` and `radius`. |
| `longitude` | number | Longitude coordinate for location-based hotel searches. Pairs with `latitude` and `radius`. |
| `iataCode` | string | The IATA code of the search location (typically an airport code). |
| `placeId` | string | The unique Place ID of the search location. Returns all hotels in the specified region. |
| `aiSearch` | string | AI-powered hotel search using a natural language query. Uses semantic search to find matching hotels. Examples: `"Romantic getaway with Italian vibes in London near the London Eye"`, `"hotels near Paris"`. |

---

### Optional Fields

#### Room & Rate Filters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxRatesPerHotel` | integer | — | Number of room rates to return per hotel, sorted by price (cheapest first). Set to `1` to get only the cheapest rate per hotel — helpful for listing pages. |
| `boardType` | string | — | Filter by board type(s). Single value (e.g., `BB`) or comma-separated for OR logic (e.g., `BB,BB1,BB2`). Values: `RO` (Room Only), `BB` (Bed & Breakfast), `HB` (Half Board), `BB1`, `BB2`, `BB3`, etc. |
| `refundableRatesOnly` | boolean | `false` | If `true`, only refundable rates (RFN) will be included in the response. |
| `roomAmenities` | array of numbers | — | Legacy room-level amenity filter. Only rates from rooms matching specified amenities are returned. Use `amenityFilterLogic` to control AND/OR behavior. Superseded by `roomAmenitiesFilter` if provided. |
| `roomAmenitiesFilter` | string | — | Grouped room-level amenity filter. Use `-` for OR within a group and `,` for AND across groups. Example: `1-2,3-4` means (1 OR 2) AND (3 OR 4). Takes precedence over `roomAmenities` and `amenityFilterLogic`. |
| `amenityFilterLogic` | string (enum) | — | Logic applied to `roomAmenities`. `AND`: room must have all specified amenities. `OR`: room must have at least one. Ignored when `roomAmenitiesFilter` is provided. Allowed: `AND`, `OR`. |
| `bedTypes` | array of strings | — | Filter by bed types extracted from room names. Only matching rooms are returned. Example values: `double`, `twin`, `king`, `queen`, `single`. |

#### Search Filters

| Field | Type | Description |
|-------|------|-------------|
| `hotelName` | string | Case-insensitive search for a hotel by name (e.g., `Hilton`). |
| `radius` | integer | Search radius in meters for location-based searches. Pairs with `latitude`. |
| `minReviewsCount` | integer | Minimum number of reviews a hotel must have to be included in results. |
| `minRating` | number | Minimum rating (scale 0–5) required for hotels in search results. |
| `zip` | string | Zip code of the search location. |
| `starRating` | array of numbers | Array of hotel star ratings to include. Ratings are rounded to the nearest half-star (e.g., `[3.5, 4.0, 4.5, 5.0]`). |
| `hotelTypeIds` | array of numbers | Array of hotel type IDs to filter search results. |
| `chainIds` | array of numbers | Array of hotel chain IDs to filter search results. |
| `facilities` | array of numbers | Array of facility IDs. By default, returns hotels with at least one of the specified facilities. |
| `strictFacilityFiltering` | boolean | If `true`, only hotels with **all** specified facilities will be returned. |
| `advancedAccessibilityOnly` | boolean | If `true`, only hotels with advanced accessibility features will be returned. |

#### Pagination & Performance

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | integer | — | Maximum time in seconds before the request times out. This is when the live rate request cuts off responses; a few extra ms will be added to return the value. Recommended: 6–12 seconds. |
| `limit` | integer | `200` | Maximum number of results to return. Max allowed is `5000`. |
| `offset` | integer | — | Number of results to skip for pagination. Paginates passed hotels, not the returned results, so actual returned count may vary. |

#### Sorting

| Field | Type | Description |
|-------|------|-------------|
| `sort` | array of objects | Sorting criteria for results. Multiple criteria can be provided, processed in order. Default sorting is by top picks (weighted by search popularity, review quality, and content completeness). Use `revenue` to sort by historical booking value. |

#### Response Control

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `roomMapping` | boolean | — | Enable room mapping to retrieve `mappedRoomId` for each room. Links a rate to its specific room, providing access to room images and additional information. |
| `includeHotelData` | boolean | `false` | If `true`, includes hotel data (name, main photo, address, rating) in the response even when searching by direct hotel IDs. By default, hotel data is only included when searching by filters. |
| `stream` | boolean | `false` | If `true`, enables streaming mode where response data is sent incrementally instead of as a single payload. |

#### Pricing & Account

| Field | Type | Description |
|-------|------|-------------|
| `margin` | number | Override the markup percentage for this specific request. Takes precedence over your account-level margin setting. Specified as a percentage (e.g., `10` for 10%). |
| `feed` | string | Which feed to use when searching for rates. Applies only to accounts with multiple feeds enabled. |

---

## Example cURL Request

```bash
curl --request POST \
  --url https://api.liteapi.travel/v3.0/hotels/rates \
  --header 'X-API-Key: <YOUR_API_KEY>' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "hotelIds": ["lp1897"],
    "occupancies": [{ "adults": 2 }],
    "currency": "USD",
    "guestNationality": "US",
    "checkin": "2025-07-01",
    "checkout": "2025-07-05"
  }'
```

---

## Response

### 200 – OK

Returns a JSON object with hotel rates and availability.

#### Top-Level Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | array of objects | Yes | Array of hotel rate results. |
| `sandbox` | boolean | No | Indicates if the request was made in a sandbox (test) environment. |
| `hotels` | array of objects | No | Hotel details included when searching by filters or when `includeHotelData=true`. |

---

#### `data[]` — Hotel Rate Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hotelId` | string | Yes | Unique identifier for the hotel. Used with the hotel content endpoint. |
| `roomTypes` | array of objects | Yes | Array of room types and their available rates. |

---

#### `data[].roomTypes[]` — Room Type Object

| Field | Type | Description |
|-------|------|-------------|
| `roomTypeId` | string | Unique identifier for the room type. |
| `name` | string | Name of the room type, including key attributes. |
| `offerId` | string | The offer ID passed during the prebook call, provided here for reference. |
| `supplier` | string | The supplier providing the inventory. Default: `nuitee`. |
| `supplierId` | integer | Numerical identifier of the supplier. Default Nuitee ID: `2`. |
| `rates` | array of objects | Array of rate details per occupancy. |
| `offerRetailRate` | array of objects | Total offer price (base rate + taxes + fees + adjustments) for all rates combined. |
| `suggestedSellingPrice` | array of objects | Minimum public selling price for all rooms combined (used for pricing control). |
| `offerInitialPrice` | array of objects | Combined original price for the offer before any discounts. |
| `priceType` | string | Pricing model applied to this offer (e.g., `commission`). |
| `rateType` | string | Rate type: `standard` or `package`. |
| `guestLevel` | integer | Used with loyalty programs to determine the guest's level of cost reduction. |

---

#### `data[].roomTypes[].rates[]` — Rate Object

| Field | Type | Description |
|-------|------|-------------|
| `rateId` | string | Unique identifier for this specific rate. |
| `occupancyNumber` | integer | Identifies which guest/room this rate is associated with in a multi-room booking. |
| `name` | string | Name of the room type, including key attributes. |
| `maxOccupancy` | integer | Maximum number of guests allowed in this room. |
| `adultCount` | integer | Number of adults included in this booking. |
| `childCount` | integer | Number of children included in this booking. |
| `childrenAges` | array of integers | Ages of children included in this booking. Empty if no children booked. |
| `boardType` | string | Short code representing the meal plan (e.g., `BB`, `RO`, `HB`). |
| `boardName` | string | Full name of the meal plan (e.g., "Bed & Breakfast"). |
| `remarks` | string | Special remarks related to the booking or room type. |
| `priceType` | string | Pricing model applied to this rate (e.g., `commission`). |
| `commission` | array of objects | Defines how pricing is structured. Used for commission-based pricing; can be `0` for net rates. Not applied for `PROPERTY_PAY` payment types. |
| `retailRate` | object | Retail rate object containing detailed pricing breakdown. |
| `cancellationPolicies` | object | Cancellation rules and conditions for the booking. |
| `paymentTypes` | array of strings | Array of payment types supported for this rate. |
| `perks` | array of objects | Perks or benefits associated with this rate (e.g., breakfast, room upgrades, property credits, early check-in, late check-out). |

---

#### `rates[].commission[]` — Commission Object

| Field | Type | Description |
|-------|------|-------------|
| `amount` | number | Amount of commission included in the total price. |
| `currency` | string | Currency the commission is expressed in. |

---

#### `rates[].perks[]` — Perk Object

| Field | Type | Description |
|-------|------|-------------|
| `perkId` | integer | Unique identifier for the perk. |
| `name` | string | Name or description of the perk. |
| `amount` | number | Monetary value of the perk. |
| `currency` | string | Currency of the perk amount. |
| `level` | string | Level of the perk: `HOTEL` (hotel-level), `RATE` (rate-level), or `ROOM` (room-level). |

---

#### `offerRetailRate[]` / `offerInitialPrice[]` / `suggestedSellingPrice[]` — Price Objects

| Field | Type | Description |
|-------|------|-------------|
| `amount` | number | The price amount. |
| `currency` | string | Currency of the price. |
| `source` | string | Source of the price (available on `suggestedSellingPrice`). |

---

#### `hotels[]` — Hotel Info Object (when `includeHotelData=true` or searching by filters)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | The liteAPI hotel ID. |
| `name` | string | Yes | The hotel name. |
| `main_photo` | string | No | URL of the hotel's main photo. |
| `thumbnail` | string | No | URL of a smaller thumbnail version of the hotel's main photo, suitable for list views and previews. |
| `address` | string | No | The hotel's address. |
| `rating` | number | No | The hotel's guest rating score. |

---

### Other Response Codes

| Status Code | Description |
|-------------|-------------|
| `200` | OK — Rates returned successfully. |
| `204` | No Content — Request was valid but no results were found. |
| `400` | Bad Request — Invalid or missing parameters. |

---

## Response Headers

| Header | Type | Description |
|--------|------|-------------|
| `Content-Type` | string | The MIME type of the response body. |
| `Content-Encoding` | string | The encoding applied to the response body. |

---

## What's Next

After retrieving rates, the next step is to create a checkout session:

➡ [Create a checkout session ("PREBOOK")](https://docs.liteapi.travel/reference/post_rates-prebook)
