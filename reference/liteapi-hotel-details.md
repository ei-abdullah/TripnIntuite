# Get the Details of a Hotel

## Overview

**API:** HOTEL DATA  
**Section:** HOTELS  
**Method:** `GET`  
**Endpoint:** `https://api.liteapi.travel/v3.0/data/hotel`

Get comprehensive details about a specific hotel including descriptions, amenities, images, location, and ratings. Perfect for displaying hotel detail pages.

---

## When to Use

- **Hotel detail pages** – Show complete hotel information
- **Booking pages** – Display hotel details before booking
- **Hotel profiles** – Build rich hotel information pages
- **Content display** – Show descriptions, amenities, and images

---

## What You Get

- **Complete hotel information** – Name, address, description, and ratings
- **Amenities list** – All available facilities and services
- **Image gallery** – Hotel photos and images
- **Location details** – Address, coordinates, and location information
- **Hotel metadata** – Star rating, chain information, and classifications

---

## Quick Start

Provide the `hotelId` as a query parameter. Returns complete hotel details including all metadata, amenities, and images.

---

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `hotelId` | string | ✅ Yes | — | Unique ID of a hotel |
| `timeout` | float | No | 4 | Request timeout in seconds |
| `language` | string | No | — | The language code, indicating in which language the results should be returned. e.g. `'fr'` |
| `advancedAccessibilityOnly` | boolean | No | — | If `true`, accessibility section will be returned |

---

## Responses

### 200 – OK

**Response Body:** `object`

#### `data` (object)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique identifier for the hotel. |
| `name` | string | ✅ Yes | Name of the hotel. |
| `hotelDescription` | string | No | Detailed description of the hotel. |
| `hotelImportantInformation` | string | No | Critical information and important details about the hotel. |
| `checkinCheckoutTimes` | object | No | Check-in and check-out timing details for the hotel. |
| `hotelImages` | array of objects | No | List of images representing the hotel. |
| `main_photo` | string | No | URL of the main photo for the hotel. |
| `thumbnail` | string | No | URL of the hotel's thumbnail image. |
| `videoUrl` | string | No | URL of the hotel's video. |
| `country` | string | No | Country where the hotel is located. |
| `city` | string | No | City where the hotel is located. |
| `starRating` | integer | No | Star rating of the hotel. |
| `location` | object | No | Geographical coordinates of the hotel. |
| `address` | string | No | Physical address of the hotel. |
| `hotelFacilities` | array of strings | No | List of facilities offered by the hotel. |
| `chain` | string | No | Name of the hotel chain, if applicable. |
| `facilities` | array of objects | No | Detailed list of facilities provided by the hotel. |
| `rooms` | array of objects | No | List of room objects available in the hotel. |
| `accessibility` | object | No | Accessibility information and certifications for the hotel. |
| `phone` | string | No | Contact phone number for the hotel. |
| `fax` | string | No | Fax number for the hotel. |
| `email` | string | No | Contact email address for the hotel. |
| `hotelType` | string | No | Type or category of the hotel. |
| `hotelTypeId` | number | No | Identifier for the hotel type. |
| `chainId` | number | No | Identifier for the hotel chain. |
| `airportCode` | string | No | IATA code of the nearest airport. |
| `rating` | number | No | Overall rating of the hotel. |
| `reviewCount` | integer | No | Total number of reviews received for the hotel. |
| `rohId` | integer | No | Room of House ID – unique identifier for the hotel property. |
| `parking` | boolean \| null | No | Indicates whether parking is available (nullable). |
| `groupRoomMin` | number \| null | No | Minimum number of rooms required for group bookings (nullable). |
| `childAllowed` | boolean \| null | No | Indicates if children are allowed at the hotel (nullable). |
| `petsAllowed` | boolean \| null | No | Indicates if pets are allowed at the hotel (nullable). |
| `policies` | array of objects | No | List of policies and guidelines applicable to the hotel. |
| `sentiment_analysis` | object | No | Sentiment analysis data derived from guest reviews. |
| `sentiment_updated_at` | string | No | Timestamp indicating when the sentiment analysis was last updated. |
| `deletedAt` | string | No | Timestamp indicating when hotel is deleted in our system. |

---

### `hotelImages` – Array Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL of the hotel image. |
| `urlHd` | string | High definition URL of the hotel image. |
| `caption` | string | Caption or description for the image. |
| `order` | integer | Display order of the image. |
| `defaultImage` | boolean | Indicates if this image is the default for the hotel. |

---

### `facilities` – Array Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `facilityId` | integer | Unique identifier for the facility. |
| `name` | string | Name of the facility. |

---

### `rooms` – Array Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier for the room. |
| `roomName` | string | Name or type designation of the room. |
| `description` | string | Detailed description of the room and its features. |
| `roomSizeSquare` | number | Size of the room in square meters. |
| `roomSizeUnit` | string | Unit of measurement for room size (e.g., `'m2'`). |
| `hotelId` | string | Identifier of the hotel this room belongs to. |
| `maxAdults` | integer | Maximum number of adults that can be accommodated. |
| `maxChildren` | integer | Maximum number of children that can be accommodated. |
| `maxOccupancy` | integer | Overall maximum occupancy of the room. |
| `bedTypes` | array of objects | List of bed configurations available in the room. |
| `roomAmenities` | array of objects | List of amenities provided in the room. |
| `photos` | array of objects | List of photos associated with the room. |

#### `bedTypes` Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `quantity` | integer | Number of beds of this type available in the room. |
| `bedType` | string | Type of the bed (e.g., `'King size'`, `'Double bed'`). |
| `bedSize` | string | Dimensions or size description of the bed. |
| `Id` | integer | Unique identifier for the bed type. |

#### `roomAmenities` Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `amenitiesId` | integer | Unique identifier for the amenity. |
| `name` | string | Name of the amenity. |
| `sort` | integer | Sort order for displaying the amenity. |

#### `photos` Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL of the room photo. |
| `imageDescription` | string | Description or caption for the photo. |
| `imageClass1` | string | Additional classification or tag for the image. |
| `imageClass2` | string | Secondary classification or tag for the image. |
| `failoverPhoto` | string | Backup URL for the photo in case the primary URL fails. |
| `mainPhoto` | boolean | Indicates if this is the main photo for the room. |
| `score` | number | Relevance score or ranking for the photo. |
| `classId` | integer | Identifier for the photo's classification. |
| `classOrder` | integer | Order of appearance for the photo based on its classification. |
| `hd_url` | string | High definition URL of the room photo. |

---

### `policies` – Array Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `policy_type` | string | Specifies the category or classification of the policy. |
| `name` | string | The official title or identifier of the policy. |
| `description` | string | A comprehensive explanation of the policy. |
| `child_allowed` | string | Details regarding the hotel's policy on children. |
| `pets_allowed` | string | Describes the pet policy, including restrictions or fees. |
| `parking` | string | Information on parking facilities, fees, and usage guidelines. |

---

## Response Headers (200)

| Header | Type |
|--------|------|
| `Content-Type` | string |
| `Content-Encoding` | string |

---

## Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request |
| `401` | Unauthorized |

---

## Related Endpoints

- [Retrieve a list of hotels](#)
- [Get the reviews of a hotel](#)

---

*Documentation source: [https://docs.liteapi.travel/reference/get_data-hotel](https://docs.liteapi.travel/reference/get_data-hotel)*
