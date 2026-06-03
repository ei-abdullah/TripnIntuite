# 2. Complete a Booking (BOOK)

## Endpoint

**Method:** `POST`  
**URL:** `https://book.liteapi.travel/v3.0/rates/book`

---

## Overview

**Step 2 of 2** in the booking flow. Complete the booking by providing guest information and payment details. This confirms the reservation and creates the final booking.

---

## When to Use

- **After prebook** – Call this after creating a prebook session.
- **Payment processing** – Submit payment information to confirm the booking.
- **Booking confirmation** – Finalize the reservation.

---

## What You Get

- **Booking ID** – Unique identifier for the confirmed booking.
- **Hotel confirmation code** – Reference code from the hotel.
- **Complete booking details** – Dates, pricing, room information.
- **Cancellation policies** – Terms for cancelling the booking.
- **Guest information** – Confirmed guest details.

---

## Payment Methods

| Method              | Description |
|---------------------|-------------|
| `ACC_CREDIT_CARD` | Direct credit card payment. In sandbox mode, use this to simulate a booking without being charged. |
| `TRANSACTION`     | Use when using the Payment SDK (provide `transactionId`). |
| `WALLET`          | Wallet payment method. |
| `CREDIT`          | Use account credit balance. |

> **Testing:** When testing sandbox bookings, use the `ACC_CREDIT_CARD` payment method to simulate a booking without getting charged.

---

## Quick Start

Provide the `prebookId`, guest information (`firstName`, `lastName`, `email`), and payment details. Returns the confirmed booking with a booking ID and confirmation code.

---

## Request

### Query Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `timeout` | integer | No       | Request timeout value. |

### Body Parameters

| Parameter         | Type             | Required | Description |
|-------------------|------------------|----------|-------------|
| `prebookId`       | string           | **Yes**  | The identifier from the pre-booking step used to confirm a booking rate. |
| `clientReference` | string           | No       | An optional client-defined reference ID that acts as an idempotency key to prevent duplicate bookings. If a booking already exists with the same client reference, the API returns a `4005` error. |
| `holder`          | object           | **Yes**  | Information on the person responsible for making the payment. May not necessarily be the traveler. |
| `guests`          | array of objects | **Yes**  | A list of all individuals included in the hotel reservation. |
| `payment`         | object           | **Yes**  | Specifies the payment method for completing the booking. |
| `metadata`        | object           | No       | Encapsulates essential metadata for fraud detection and compliance, including IP, location, language, device details, and marketing parameters. |
| `guestPayment`    | object           | No       | The payment method used for the transaction. Determines where the money for the booking comes from. Recommended when you are the merchant of record to improve fraud detection. |

### Example Request (cURL)

```bash
curl --request POST \
  --url https://book.liteapi.travel/v3.0/rates/book \
  --header 'X-API-Key: <YOUR_API_KEY>' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "prebookId": "<PREBOOK_ID>",
    "holder": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "guests": [
      {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      }
    ],
    "payment": {
      "method": "ACC_CREDIT_CARD"
    }
  }'
```

---

## Response

### 200 – Successful Response

Returns a `data` object with the following fields:

#### Top-Level Fields

| Field                    | Type              | Required | Description |
|--------------------------|-------------------|----------|-------------|
| `bookingId`              | string            | **Yes**  | The unique identifier for the confirmed booking. Used to reference the booking via API or support. |
| `clientReference`        | string            | No       | A reference ID provided by the client for tracking purposes. |
| `supplierBookingId`      | string            | No       | The booking ID assigned by the supplier. Use `bookingId` instead. |
| `supplierBookingName`    | string            | No       | The name associated with the booking in the supplier's system. Defaults to Nuitee. |
| `supplier`               | string            | No       | The supplier handling this booking. Defaults to Nuitee. |
| `supplierId`             | integer           | No       | The unique numerical identifier for the supplier. Defaults to `2` for Nuitee. |
| `status`                 | string            | **Yes**  | The current booking status. At this point it will be `CONFIRMED`. The other possible value is `CANCELED`. |
| `hotelConfirmationCode`  | string            | No       | The confirmation code issued by the hotel. Not available at booking time — Nuitee performs a manual process to contact the hotel and retrieve this code. |
| `checkin`                | date              | **Yes**  | The check-in date for the booking (ISO format). |
| `checkout`               | date              | **Yes**  | The check-out date for the booking (ISO format). |
| `hotel`                  | object            | No       | An object containing details about the booked hotel. |
| `price`                  | number            | **Yes**  | The final total price of all rooms on the booking. |
| `commission`             | number            | No       | The total commission amount associated with all rooms on the booking. |
| `currency`               | string            | **Yes**  | The currency in which the booking price is displayed. |
| `createdAt`              | date-time         | **Yes**  | The timestamp when the booking was created. |
| `updatedAt`              | date-time         | No       | The timestamp when the booking was last updated. |
| `cancellationPolicies`   | object            | No       | Cancellation rules and penalties for the booking. |
| `prebookId`              | string            | No       | The identifier from the pre-booking step. |
| `guestId`                | integer           | No       | Guest ID associated with the booking. |
| `trackingId`             | string            | No       | The tracking identifier for the booking. |
| `sellingPrice`           | string            | No       | The total selling price of the booking. |
| `exchangeRate`           | number            | No       | The exchange rate used for currency conversion. |
| `exchangeRateUsd`        | number            | No       | The USD exchange rate for the booking. |
| `tag`                    | string            | No       | Indicates if the booking is refundable: `RFN` for refundable, `NRFN` for non-refundable. |
| `lastFreeCancellationDate` | string          | No       | The latest date/time when the booking can be cancelled without penalties (ISO 8601 format). |
| `userId`                 | integer           | No       | The ID of the user who made the booking. |
| `nationality`            | string            | No       | The nationality of the guest. |
| `loyaltyGuestId`         | integer           | No       | The loyalty or membership ID of the guest. |
| `cancelledAt`            | date-time         | No       | The timestamp when the booking was cancelled. |
| `refundedAt`             | date-time         | No       | The timestamp when the booking was refunded. |
| `cancelledBy`            | integer           | No       | The ID of who cancelled the booking. Empty at this step. |
| `remarks`                | string            | No       | Any additional notes related to the booking. |
| `hotelRemarks`           | string            | No       | Hotel-specific remarks from the booking. |
| `addonsTotalAmount`      | number            | No       | The total amount charged for any additional services or extras. |
| `goodwillPayment`        | object            | No       | Goodwill payment information for the booking. |
| `guestLevel`             | integer           | No       | The guest's loyalty or membership level, if applicable. |
| `sandbox`                | boolean           | No       | Indicates whether this booking is in a test/sandbox environment (`true`/`false`). |

#### `bookedRooms` Array

Each object in `bookedRooms` contains the following fields:

| Field                 | Type                     | Description |
|-----------------------|--------------------------|-------------|
| `roomType`            | object                   | Details about the booked room type. |
| `boardType`           | string                   | Short code representing the meal plan included. |
| `boardName`           | string                   | Full name of the meal plan included. |
| `adults`              | integer                  | Number of adults in this room. |
| `children`            | integer                  | Number of children in this room. |
| `rate`                | object                   | Rate information for the booked room. |
| `firstName`           | string                   | First name of the person responsible for the booking. |
| `lastName`            | string                   | Last name of the person responsible for the booking. |
| `childrenAges`        | array of integers | null | Ages of children in this room. |
| `board`               | string                   | Full name of the meal plan. |
| `boardCode`           | string                   | Short code for the meal plan. |
| `cancellationPolicies`| object                   | Cancellation rules and conditions for this room. |
| `room_id`             | string                   | Unique identifier for the room. |
| `occupancy_number`    | integer                  | Occupancy number within this booking. |
| `amount`              | number                   | Room price for this booking. |
| `currency`            | string                   | Currency code for the room cost. |
| `children_count`      | integer                  | Number of children in this room. |
| `remarks`             | string                   | Additional remarks for this room. |
| `guests`              | array of objects         | Guest details for this room. |

#### `guests` Array (within `bookedRooms`)

| Field             | Type    | Description |
|-------------------|---------|-------------|
| `firstName`       | string  | Guest's first name. |
| `lastName`        | string  | Guest's last name. |
| `email`           | string  | Guest's email address. |
| `phone`           | string  | Guest's phone number. |
| `remarks`         | string  | Remarks specific to this guest. |
| `occupancyNumber` | integer | Occupancy number for this guest. |

#### `holder` Object

An object containing details of the person responsible for the booking.

#### `addon` Array

| Field              | Type    | Description |
|--------------------|---------|-------------|
| `addon`            | string  | The name or type of the additional service or extra. |
| `value`            | number  | The price of the addon in the specified currency. |
| `currency`         | string  | The currency in which the addon is priced. |
| `originalValue`    | number  | The original price of the addon before any discounts. |
| `originalCurrency` | string  | The original currency of the addon price. |
| `expiryDate`       | string  | The expiration date of the addon, if applicable. |
| `addonVoucherCode` | string  | A code associated with the addon voucher, if applicable. |
| `addonVoucherId`   | integer | A unique identifier for the addon voucher. |
| `status`           | string  | The current status of the addon (e.g., active, expired). |

---

### Error Responses

| Status Code | Description     |
|-------------|-----------------|
| `400`       | Bad Request     |
| `401`       | Unauthorized    |

### Response Headers

| Header             | Type   |
|--------------------|--------|
| `Content-Type`     | string |
| `Content-Encoding` | string |

---

## Previous Step

➡️ **[1. Create a Checkout Session (PREBOOK)](https://docs.liteapi.travel/reference/post_rates-prebook)**

---

*Documentation source: [liteAPI – Complete a Booking (BOOK)](https://docs.liteapi.travel/reference/post_rates-book)*
