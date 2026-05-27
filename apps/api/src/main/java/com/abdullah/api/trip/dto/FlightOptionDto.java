package com.abdullah.api.trip.dto;

import java.util.List;

public record FlightOptionDto(
        String offerId,
        String carrierCode,
        String carrierName,
        String carrierLogo,
        String flightNumber,
        String departureTime,
        String arrivalTime,
        int durationMinutes,
        int stops,
        List<String> via,
        double price,
        String currency,
        boolean isCheapest
) {}