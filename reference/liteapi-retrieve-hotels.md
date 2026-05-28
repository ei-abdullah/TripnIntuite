# Retrieve a List of Hotels

**API Category:** Hotel Data > Hotels

```
GET https://api.liteapi.travel/v3.0/data/hotels
```

---

## Overview

Search and retrieve hotel listings based on various criteria. Get hotel metadata including names, addresses, ratings, amenities, and images for display in your application.

---

## When to Use

- **Hotel listings** — Display hotel search results
- **Location-based search** — Find hotels by city, coordinates, or Place ID
- **Hotel discovery** — Browse hotels in specific areas
- **Metadata retrieval** — Get hotel information for display

---

## What You Get

- **Hotel list** — Matching hotels with complete metadata
- **Basic information** — Names, addresses, ratings, and locations
- **Amenities** — Available facilities and features
- **Images** — Hotel photos for display
- **Identifiers** — Hotel IDs for use in rate searches

---

## Search Options

- **By city** — Search hotels in a specific city
- **By coordinates** — Find hotels near latitude/longitude with radius
- **By Place ID** — Get hotels within a specific place boundary
- **By hotel IDs** — Retrieve specific hotels by their IDs

---

## Quick Start

Provide search criteria (`city`, `coordinates+radius`, `placeId`, or `hotelIds`). Returns matching hotels with complete metadata.

---

## Request

### cURL Example

```bash
curl --request GET \
  --url https://api.liteapi.travel/v3.0/data/hotels \
  --header 'X-API-Key: <YOUR_API_KEY>' \
  --header 'accept: application/json'
```

---

## Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `countryCode` | string | Country code ISO-2 — e.g. `SG` |
| `cityName` | string | Name of the city |
| `hotelName` | string | Name of the hotel (loose match, case-insensitive, e.g. `hilton`) |
| `offset` | integer | Number of rows to skip before starting to return results |
| `limit` | integer | Maximum number of results to return. Default: 200. Max: 5000 |
| `lastUpdatedAt` | string | Retrieve only hotels updated since this date/time (RFC3339 format) |
| `longitude` | number | Longitude geo coordinate |
| `latitude` | number | Latitude geo coordinate |
| `radius` | integer | Radius in meters (minimum 1000m) |
| `aiSearch` | string | Semantic/AI search query — e.g. `"Romantic getaway with Italian vibes in London near the London Eye"` |
| `timeout` | float | Request timeout in seconds |
| `zip` | string | ZIP code of the location |
| `minRating` | float | Minimum guest rating — e.g. `8.6` |
| `minReviewsCount` | number | Minimum number of reviews — e.g. `100` |
| `facilityIds` | string | Comma-separated list of facility IDs — e.g. `1,2,3` |
| `hotelTypeIds` | string | Comma-separated list of hotel type IDs — e.g. `201,204,208` |
| `chainIds` | string | Comma-separated list of hotel chain IDs — e.g. `14675,14677` |
| `strictFacilitiesFiltering` | boolean | If `true`, only hotels with **all** specified facilities are returned |
| `starRating` | string | Comma-separated star ratings (allowed decimals: .0 and .5, range 1–5) — e.g. `3.5,4.0,5.0` |
| `placeId` | string | Unique ID of a place (from `/data/places`). Searches within 1km radius of the place center |
| `language` | string | Language code for results — e.g. `fr` |
| `hotelIds` | string | Comma-separated hotel IDs — e.g. `lp1897,lp1343` |
| `advancedAccessibilityOnly` | boolean | If `true`, only hotels with advanced accessibility features are returned |

---

## Responses

### 200 — OK

Returns a list of hotels matching the provided search criteria.

#### Response Body

```json
{
  "data": [
    {
      "id": "lp42fec",
      "name": "Hotel Jadran",
      "hotelDescription": "Location: With a stay at...",
      "currency": "EUR",
      "country": "HR",
      "city": "Sibenik",
      "latitude": 43.73464,
      "longitude": 15.88974,
      "address": "Obala dr. Franje Tudmana 52",
      "zip": "22000",
      "main_photo": "https://liteapi-travel-static-...",
      "thumbnail": "https://liteapi-travel-static-...",
      "stars": 3,
      "hotelTypeId": 204,
      "chainId": 14675,
      "chain": "Hilton",
      "rating": 8.5,
      "reviewCount": 120,
      "facilityIds": [1, 2, 3],
      "accessibilityAttributes": {
        "rohId": 12345,
        "deletedAt": null
      },
      "score": 0.95
    }
  ],
  "total": 1,
  "place": {
    "placeId": "string",
    "displayName": "Marriott New York JFK Airport",
    "addressComponents": [
      {
        "languageCode": "en",
        "longText": "France",
        "shortText": "FR",
        "types": ["country", "political"]
      }
    ],
    "location": {
      "latitude": 43.73464,
      "longitude": 15.88974
    },
    "viewport": {
      "high": {},
      "low": {}
    },
    "types": ["lodging", "hotel", "establishment"]
  }
}
```

#### Response Fields

##### `data` (array of objects)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique identifier of the hotel |
| `name` | string | ✅ | Name of the hotel |
| `hotelDescription` | string | | Brief description of the hotel and its facilities |
| `currency` | string | | Currency code used for pricing (e.g. `USD`, `EUR`) |
| `country` | string | ✅ | Country where the hotel is located |
| `city` | string | ✅ | City where the hotel is situated |
| `latitude` | number | ✅ | Latitude coordinate of the hotel's location |
| `longitude` | number | ✅ | Longitude coordinate of the hotel's location |
| `address` | string | | Street address of the hotel |
| `zip` | string | | Postal code of the hotel |
| `main_photo` | string | | Main image representing the hotel (URL) |
| `thumbnail` | string | | Smaller version of the main photo used for previews (URL) |
| `stars` | number | | Hotel's star rating (e.g. 3, 4, 5) |
| `hotelTypeId` | number | | Unique identifier for the hotel's category or type |
| `chainId` | number | | Unique identifier of the hotel chain |
| `chain` | string | | Name of the hotel chain (e.g. Hilton, Marriott) |
| `rating` | float | | Average guest rating (e.g. `8.5` out of 10) |
| `reviewCount` | integer | | Total number of guest reviews |
| `facilityIds` | array of integers | | Array of facility IDs available at the hotel |
| `accessibilityAttributes` | object | | Compact representation of the hotel's accessibility features |
| `score` | float | | Similarity score (0.0–1.0) for how well the hotel matches a `placeId` search. Only present when `placeId` is used |
| `deletedAt` | string | | Timestamp indicating when hotel was deleted in the system |

##### `accessibilityAttributes` object

| Field | Type | Description |
|---|---|---|
| `rohId` | integer | Room of House ID — unique identifier for the hotel property |

##### `total`

| Field | Type | Description |
|---|---|---|
| `total` | integer | Total number of hotels retrieved based on the applied filters |

##### `hotelIds`

| Field | Type | Description |
|---|---|---|
| `hotelIds` | array of strings | Array of unique hotel identifiers matching the filters or query parameters |

##### `place` object *(only present when `placeId` parameter is used)*

| Field | Type | Description |
|---|---|---|
| `placeId` | string | The place ID used in the search |
| `displayName` | string | Display name of the place (e.g. `Marriott New York JFK Airport`) |
| `addressComponents` | array of objects | List of address components (country, city, postal code, etc.) |
| `location` | object | Geographic coordinates of the place |
| `viewport` | object | Recommended viewport for displaying the place (high/low lat-lng bounds) |
| `types` | array of strings | List of place types (e.g. `lodging`, `hotel`, `establishment`) |

###### `addressComponents` object

| Field | Type | Description |
|---|---|---|
| `languageCode` | string | Language code for the address component (e.g. `en`, `en-US`) |
| `longText` | string | Full text of the address component (e.g. `France`) |
| `shortText` | string | Abbreviated text for the address component (e.g. `FR`) |
| `types` | array of strings | Types describing the component (e.g. `country`, `political`) |

#### Response Headers

| Header | Type |
|---|---|
| `Content-Type` | string |
| `Content-Encoding` | string |

---

### 400 — Bad Request

The request was malformed or missing required parameters.

### 401 — Unauthorized

Invalid or missing API key.

---

## Related Endpoints

- [Search for a specific place](/reference/get_data-places)
- [Get the details of a hotel](/reference/get_data-hotels-hotelid)
