# Create a Checkout Session (PREBOOK)

**Method:** `POST`  
**Endpoint:** `https://api.liteapi.travel/v3.0/flights/prebooks`

---

## Overview

Initiate a flight booking session by reserving the offer with the provider, creating a payment intent when you use the Stripe SDK, and discovering available ancillary services — all in a single request.

### When to Use

- Start the booking flow once a user has confirmed their flight selection
- Collect passenger details and initiate payment processing
- Discover add-ons like seat selection and extra baggage before final confirmation

### What You Get

- **Prebook ID** — required to complete the booking at `/flights/bookings`
- **Payment intent** (`transactionId`, `secretKey`) when `usePaymentSdk` is `true` — for Stripe SDK integration
- **Credit line snapshot** (`creditLine` in the response) when you set `includeCreditBalance: true` and your account has an enabled credit line with payment bypass
- **Available services** (`servicesAttachable`) including seats and baggage options
- **Booking confirmation** from the provider with reservation details

### Key Features

- **End-to-end prebook flow:** Verifies offer → payment setup (Stripe payment intent or credit line) → books with provider → fetches services
- **Payment options:** `usePaymentSdk: true` uses the Stripe SDK. `usePaymentSdk: false` is allowed when your user has payment bypass (sandbox or whitelabel) and an enabled credit line; the API rejects the request if neither Stripe nor an eligible credit line applies
- **Ancillary services:** Returns attachable services (seats, baggage) that can be added before final booking
- **Same shape as /book:** Uses `offerId` instead of `prebookId`

### Quick Start

- **Required fields:** `offerId` (from search/verify), `contact` (name, email, phone), `passengers` (with birthday, document, and name details)
- **Payment:** Send `usePaymentSdk: true` for Stripe (typical). Send `usePaymentSdk: false` only when a credit line is enabled for the account; otherwise you receive a validation error
- **Tip:** Use the `servicesAttachable` in the response to offer seat selection or extra baggage before calling `/flights/bookings`

---

## Authentication

All requests must include the `X-API-Key` header with your API key.

```
X-API-Key: YOUR_API_KEY
```

---

## Request Body Parameters

Offer, passenger, contact, and payment configuration to initiate a prebook.

### Top-Level Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `offerId` | string | ✅ Yes | — | The offerId from the search results (msgpack-encoded; unpacks to provider offerId) |
| `usePaymentSdk` | boolean | No | `true` | If `true`, a Stripe payment intent is created (`transactionId`, `secretKey`). If `false`, a credit line must be enabled for the user (with payment bypass); otherwise the request is rejected |
| `payment` | object | No | — | Payment configuration options |
| `contact` | object | ✅ Yes | — | Primary contact person for the booking (receives confirmation emails) |
| `passengers` | array of objects | ✅ Yes | — | List of passengers travelling. Length must match the adults+children+infants counts from the search |

---

### `payment` Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `descriptorSuffix` | string | No | Suffix appended to the Stripe payment descriptor (visible on customer's bank statement) |
| `voucherCode` | string | No | An optional voucher code to apply discounts to the booking. The vouchers API allows creation of these discounts |

---

### `contact` Object

Primary contact person for the booking (receives confirmation emails).

| Field | Type | Required | Example | Description |
|-------|------|----------|---------|-------------|
| `email` | string | ✅ Yes | `j.doe@example.com` | Contact email address for booking confirmation |
| `firstName` | string | ✅ Yes | `John` | Contact first name |
| `lastName` | string | ✅ Yes | `Doe` | Contact last name |
| `middleName` | string | No | `Joshua` | Contact middle name (optional) |
| `phoneCountryCode` | string | No | `33` | Phone country code without + (e.g. 1 for US, 33 for France) |
| `phoneNumber` | string | ✅ Yes | `670-355-3640` | Phone number without country code |

---

### `passengers` Array of Objects

List of passengers travelling. Length must match the adults+children+infants counts from the search.

| Field | Type | Required | Example | Description |
|-------|------|----------|---------|-------------|
| `birthday` | string | No | `1996-04-28` | Date of birth (YYYY-MM-DD) |
| `documentExpiry` | string | No | `2030-04-28` | Travel document expiry date (YYYY-MM-DD) |
| `documentIssueCountry` | string | No | `US` | ISO country code of the document issuing country |
| `documentNumber` | string | No | `123456789` | Travel document number |
| `documentType` | string | No | `passport` | Type of travel document (e.g. `passport`, `id_card`) |
| `firstName` | string | No | `John` | Passenger first name (as on travel document) |
| `gender` | string | No | `M` | Passenger gender: `M` or `F` |
| `lastName` | string | No | `Doe` | Passenger last name (as on travel document) |
| `middleName` | string | No | `Joshua` | Passenger middle name (optional) |
| `nationality` | string | No | `US` | Passenger nationality as ISO country code |
| `passengerType` | integer | No | `0` | Passenger type: `0` = adult, `1` = child, `2` = infant |
| `loyaltyPrograms` | array of objects | No | — | Frequent flyer / loyalty programs for this passenger (Sabre and Travelport only; ignored for Atlas) |

---

## Example Request

```bash
curl --request POST \
  --url https://api.liteapi.travel/v3.0/flights/prebooks \
  --header 'X-API-Key: YOUR_API_KEY' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "offerId": "h6NwaWTZJDAxOWQwNjZhLWNjMTktNzcyNi04ODM1...",
    "payment": {
      "descriptorSuffix": "FLIGHT"
    },
    "passengers": []
  }'
```

---

## Responses

### `200` — Prebook Created Successfully

The response body contains a `data` array (always one item) with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `prebookId` | string | Unique prebook identifier — use this in `/bookings` to complete the booking |
| `booking` | object | Booking record created with the provider, including journey, passengers, and order reference |
| `servicesAttachable` | object | Ancillary services available to attach before booking (seats, baggage, etc.) |
| `price` | number | Total price to charge (in the currency field) |
| `currency` | string | ISO 4217 currency code for price and secretKey |
| `transactionId` | string | When `usePaymentSdk` was `true`: Stripe transaction ID — use as `payment.transactionId` with `payment.method: TRANSACTION_ID` when calling `/flights/bookings`. Empty or omitted when prebooking on a credit line only |
| `secretKey` | string | When `usePaymentSdk` was `true`: Stripe payment intent client secret — use with the Stripe SDK before calling `/flights/bookings` |
| `publishableKey` | string \| null | When `usePaymentSdk` was `true`: Stripe publishable key (`null` if not applicable) |
| `offerId` | string | The offerId used to create this prebook |
| `voucherCode` | string | Represents the unique code used to redeem a voucher during the transaction |
| `voucherTotalAmount` | string | Specifies the total monetary value or discount amount provided by the voucher |

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

---

### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Bad request — missing or invalid prebook parameters |
| `401` | Unauthorized |
| `404` | Offer expired, not found, or session expired |
| `500` | Server error |
| `502` | Provider error during prebook |
| `503` | Service unavailable |

---

## Related Endpoints

- **Previous:** [Verify flight offer](https://docs.liteapi.travel/reference/post_flights-verify)
- **Next:** [1.2 Attach services to prebook (Optional)](https://docs.liteapi.travel/reference/post_flights-prebooks-prebookid-services)

---

*Source: [https://docs.liteapi.travel/reference/post_flights-prebooks](https://docs.liteapi.travel/reference/post_flights-prebooks)*  
*Last updated: approximately 1 month ago*
