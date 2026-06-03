# 1. Create a Checkout Session (PREBOOK)

## Endpoint

**Method:** `POST`  
**URL:** `https://book.liteapi.travel/v3.0/rates/prebook`

---

## Overview

**Step 1 of 2** in the booking flow. Create a prebook session to check the availability of a rate and get final pricing before payment. The `prebookId` returned is required to complete the booking in the next step.

---

## When to Use

- **Before payment** – Always call this before completing a booking.
- **Rate confirmation** – Verify final pricing and availability.
- **Session creation** – Generate a checkout session for your payment flow.

---

## What You Get

- **Prebook ID** – Required for the next step (completing the booking).
- **Final pricing** – Confirmed rates with all fees and taxes.
- **Terms and conditions** – Cancellation policies and booking rules.
- **Room details** – Complete information about the selected rooms.

---

## Key Features

- **Live availability check** – Verifies the rate is available before you collect payment.
- **Payment SDK support** – Set `usePaymentSdk=true` to use client-side payment forms.
- **Reusable** – `prebookId` can be used for multiple bookings if needed.

---

## Quick Start

Provide the `offerId` from your hotel rates search and set `usePaymentSdk` (`true`/`false`). Returns a `prebookId` to use in the next step.

> **Next Step:** Use the `prebookId` with `/rates/book` to complete the booking.

---

## Request

### Query Parameters

| Parameter              | Type    | Required | Description |
|------------------------|---------|----------|-------------|
| `timeout`              | integer | No       | Request timeout value. |
| `includeCreditBalance` | boolean | No       | Optional flag to include credit line information in the response. When set to `true`, credit line details will be returned if the user has a credit line available. Can also be provided in the request body. |

### Body Parameters

| Parameter              | Type             | Required | Description |
|------------------------|------------------|----------|-------------|
| `offerId`              | string           | **Yes**  | The unique identifier of the selected offer from the search results. |
| `usePaymentSdk`        | boolean          | **Yes**  | Specifies whether the fields needed to call the payment processing SDK are returned. Set to `true` if using the SDK for payment processing. |
| `voucherCode`          | string           | No       | An optional voucher code to apply discounts to the booking. |
| `addons`               | array of objects | No       | A list of additional services or extras to add to the booking (e.g., Uber voucher, eSIM card). The final booking amount is the sum of the offer's total price plus the cost of any addons. |
| `bedTypeIds`           | array of integers| No       | An optional array of bed type IDs to specify preferred bed configurations. Availability depends on hotel inventory. |
| `includeCreditBalance` | boolean          | No       | Optional flag to include credit line information in the response when set to `true`. |

### Example Request (cURL)

```bash
curl --request POST \
  --url https://book.liteapi.travel/v3.0/rates/prebook \
  --header 'X-API-Key: <YOUR_API_KEY>' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "offerId": "<OFFER_ID>",
    "usePaymentSdk": true
  }'
```

---

## Response

### 200 – OK

Returns a `data` object with the following fields:

#### Top-Level Fields

| Field                   | Type             | Required | Description |
|-------------------------|------------------|----------|-------------|
| `prebookId`             | string           | **Yes**  | The pre-booking ID required to confirm a booking. Reusable for multiple bookings. Required for the next step unless using the payment SDK (which also needs `transactionId` and `secretKey`). |
| `offerId`               | string           | No       | The offer ID passed during the prebook call, returned here for reference. |
| `hotelId`               | string           | **Yes**  | The unique identifier for the hotel related to this pre-booking. |
| `checkin`               | string           | **Yes**  | Check-in date in `YYYY-MM-DD` format. |
| `checkout`              | string           | **Yes**  | Check-out date in `YYYY-MM-DD` format. |
| `currency`              | string           | **Yes**  | The currency in which prices and fees are displayed. |
| `termsAndConditions`    | string           | No       | Terms and conditions applicable to this booking. |
| `price`                 | number           | **Yes**  | The final price of the booking for all rooms after applicable calculations. |
| `priceType`             | string           | No       | Defines how pricing is structured. Only `commission` is currently used. Can be set to `0` for net rates. |
| `priceDifferencePercent`| integer          | No       | Indicates the percentage difference between the original and final price. Should be `0`; a non-zero value means an alternate rate was found because the original sold out. |
| `cancellationChanged`   | boolean          | No       | Indicates if cancellation policies have changed since the initial offer. **Important field to check.** |
| `boardChanged`          | boolean          | No       | Indicates if the board (meal plan) has changed since the initial offer. **Important field to check.** |
| `supplier`              | string           | No       | The supplier providing the inventory. Defaults to `Nuitee`. |
| `supplierId`            | integer          | No       | Numerical identifier of the supplier. Nuitee's default ID is `2`. |
| `transactionId`         | string           | No       | A unique transaction identifier. Only returned when using the payment SDK. |
| `paymentTypes`          | array of strings | No       | An array of payment types supported for this booking request. |
| `mappedRoomId`          | integer \| null  | No       | The mapped room ID, or `null` if not mapped. |
| `secretKey`             | string           | No       | A key for calling the payment SDK to secure booking-related payments. Only returned when using the payment SDK. |
| `voucherCode`           | string           | No       | The unique code used to redeem a voucher during the transaction. |
| `voucherTotalAmount`    | string           | No       | The total monetary value or discount amount provided by the voucher. |
| `commission`            | number           | No       | The total commission earned for all rooms being booked. |
| `guestLevel`            | integer          | No       | Used with loyalty programs to determine the guest's level of cost reduction. |

#### `roomTypes` Array

Each object in `roomTypes` contains a `rates` array with the following fields:

| Field              | Type             | Description |
|--------------------|------------------|-------------|
| `rateId`           | string           | The unique identifier for a specific rate within the offer. |
| `occupancyNumber`  | integer          | Identifies which guest is associated with each room in a multi-room booking. |
| `name`             | string           | The name of the room type, including key attributes. |
| `maxOccupancy`     | integer          | Maximum number of guests allowed in this room. |
| `adultCount`       | integer          | Number of adults included in this booking. |
| `childCount`       | integer          | Number of children included in this booking. |
| `childrenAges`     | array of integers| Ages of each child included. Empty array if no children. |
| `boardType`        | string           | Short code representing the meal plan included. |
| `boardName`        | string           | Full name of the meal plan included. |
| `remarks`          | string           | Any special remarks related to the booking or room type. |
| `priceType`        | string           | Pricing structure (e.g., `commission`). |
| `commission`       | array of objects | Commission details: `amount` (number) and `currency` (string). |
| `retailRate`       | object           | Final price details including taxes and fees. |
| `cancellationPolicies` | object      | Cancellation rules and conditions for the booking. |
| `paymentTypes`     | array of strings | Supported payment types for this booking. |
| `perks`            | array of objects | Perks/benefits: `perkId`, `name`, `amount`, `currency`, `level`. |
| `suggestedSellingPrice` | object     | Minimum public selling price for all rooms combined, used for pricing control. |

#### `addonsRequest` Array

| Field          | Type   | Description |
|----------------|--------|-------------|
| `addon`        | string | The name or type of the additional service requested. |
| `value`        | number | The price of the addon in the specified currency. |
| `currency`     | string | The currency in which the addon is priced. |
| `addonDetails` | object | Additional details about the requested addon. |

#### `creditLine` Object

Returned when `includeCreditBalance` is `true` and the user has a credit line available.

---

### ⚠️ Three Important Fields to Check

After a successful prebook response, always verify these three fields before proceeding to booking:

1. **`priceDifferencePercent`** – Should be `0`. A non-zero value means the original rate sold out and an alternate was substituted at a different price.
2. **`cancellationChanged`** – Should be `false`. A `true` value means cancellation policies changed since the original offer.
3. **`boardChanged`** – Should be `false`. A `true` value means the meal plan changed since the original offer.

---

### Error Responses

| Status Code | Description       |
|-------------|-------------------|
| `400`       | Bad Request       |
| `401`       | Unauthorized      |
| `408`       | Request Timeout   |

---

### Response Headers

| Header             | Type   |
|--------------------|--------|
| `Content-Type`     | string |
| `Content-Encoding` | string |

---

## Next Step

Use the `prebookId` from this response to complete the booking:

➡️ **[2. Complete a Booking (BOOK)](https://docs.liteapi.travel/reference/post_rates-book)**

---

*Documentation source: [liteAPI – Create a Checkout Session (PREBOOK)](https://docs.liteapi.travel/reference/post_rates-prebook)*