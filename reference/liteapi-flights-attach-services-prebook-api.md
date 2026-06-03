# 1.2 Attach Services to Prebook (Optional)

**Method:** `POST`  
**Endpoint:** `https://api.liteapi.travel/v3.0/flights/prebooks/{prebookId}/services`

---

## Overview

Add ancillary services such as seat selection or extra baggage to an existing prebook before confirming the final booking.

### When to Use

- **Seat selection** — Allow users to choose specific seats after prebook
- **Extra baggage** — Let users add additional luggage allowance
- **Price update** — Required when services change the total booking cost
- **Voucher discount** — Optional `voucherCode` when attaching services changes the total and you need the discount reflected on the new payment intent

### What You Get

- **Updated prebook** with the selected services attached
- **New payment intent** (`transactionId`, `secretKey`) reflecting the updated total price (after any voucher discount)
- **Same response format** as `POST /flights/prebooks` for easy integration

### Key Features

- **Seat selection:** Assign specific seats to each passenger and segment
- **Extra baggage:** Add checked baggage or overweight allowances
- **Updated payment:** Automatically creates a new Stripe payment intent with the adjusted price
- **Voucher recalculation:** When a voucher applies, the discount is recomputed against the updated total (journey + ancillaries); invalid or expired vouchers return `400` (same as prebook)
- **Modifies in place:** Updates the existing prebook record in the database

### Quick Start

Provide the `prebookId` in the URL path and `selectedServices` in the request body. Optionally pass `voucherCode` to apply a discount. Use the **new** `transactionId` from this response (not the original prebook `transactionId`) when confirming payment with Stripe and when calling `POST /flights/bookings`.

---

## Authentication

All requests must include the `X-API-Key` header with your API key.

```
X-API-Key: YOUR_API_KEY
```

---

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prebookId` | string | ✅ Yes | The prebook ID (must have `provider_booking_id` from initial prebook) |

---

## Request Body Parameters

Selected ancillary services to attach to the prebook.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selectedServices` | array of objects | ✅ Yes | Services to attach (from `servicesAttachable.groups` in prebook response) |
| `voucherCode` | string | No | An optional voucher code to apply discounts to the booking. The vouchers API allows creation of these discounts |

### `selectedServices` Object Structure

Each object in the `selectedServices` array represents a service to attach to the prebook. The available services and their required structure are returned in the `servicesAttachable.groups` field of the initial prebook (`POST /flights/prebooks`) response.

---

## Example Request

```bash
curl --request POST \
  --url https://api.liteapi.travel/v3.0/flights/prebooks/{prebookId}/services \
  --header 'X-API-Key: YOUR_API_KEY' \
  --header 'accept: application/json' \
  --header 'content-type: application/json'
```

---

## Responses

### `200` — Services Attached Successfully

Returns the updated prebook data with the new price and `transactionId`.

The response body contains a `data` array (always one item) with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `prebookId` | string | Unique prebook identifier |
| `booking` | object | Updated booking record after attaching services |
| `servicesAttachable` | object | Remaining ancillary services available to attach |
| `price` | number | Updated total price including attached services |
| `currency` | string | ISO 4217 currency code for the updated price |
| `transactionId` | string | New Stripe transaction ID reflecting the updated price — use this (not the prebook `transactionId`) when calling `/bookings` |
| `secretKey` | string | New Stripe payment intent secret key for SDK confirmation |
| `voucherCode` | string | The unique code used to redeem a voucher during the transaction |
| `voucherTotalAmount` | number | Total monetary value or discount amount provided by the voucher, in currency |
| `sellingPriceToUser` | number | Amount the customer pays after the voucher discount (`price` minus `voucherTotalAmount`) |

#### Example Response (`200`)

```json
{
  "data": [
    {
      "prebookId": "019d0674-834d-7db7-9c8b-93fe8e46e...",
      "booking": {
        "timestamp": "2026-03-19T14:16:40Z",
        "journey": {
          "journeyKey": "30073d47d441f174",
          "segments": [
            {
              "segmentKey": "b4cd7e77",
              "originCode": "JFK",
              "originName": "John F. Kennedy International",
              "destinationCode": "FRA",
              "destinationName": "Frankfurt Main Airport",
              "departureTime": "2026-07-02T16:10:00",
              "arrivalTime": "2026-07-03T05:55:00",
              "direction": "OUTBOUND",
              "duration": {
                "iso8601": "PT7H45M",
                "minutes": 465
              },
              "flight": {
                "marketingNumber": "2017",
                "operatingNumber": "2017"
              }
            }
          ]
        }
      }
    }
  ]
}
```

> **Important:** Always use the `transactionId` returned from this endpoint (not the one from the original prebook) when confirming payment with Stripe and when calling `POST /flights/bookings`.

---

### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad request — missing or invalid service parameters |
| `401` | Unauthorized |
| `404` | Prebook or booking not found |
| `409` | Conflict |
| `502` | Provider error during service attachment |

---

## Related Endpoints

- **Previous:** [1. Create a checkout session (PREBOOK)](https://docs.liteapi.travel/reference/post_flights-prebooks)
- **Next:** [2. Complete a booking](https://docs.liteapi.travel/reference/post_flights-bookings)

---

*Source: [https://docs.liteapi.travel/reference/post_flights-prebooks-prebookid-services](https://docs.liteapi.travel/reference/post_flights-prebooks-prebookid-services)*  
*Last updated: approximately 1 month ago*
