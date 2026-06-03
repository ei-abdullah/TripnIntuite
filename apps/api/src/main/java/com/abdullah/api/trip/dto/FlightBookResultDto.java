package com.abdullah.api.trip.dto;

// A confirmed flight booking. simulated=true marks it as a synthesized
// confirmation (LiteAPI flight booking is payment-gated and unavailable on this
// sandbox account). status is CONFIRMED on success.
public record FlightBookResultDto(
        String bookingRef,
        String offerId,
        String status,
        boolean simulated
) {}