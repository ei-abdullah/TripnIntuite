package com.abdullah.api.trip.dto;

// Confirmed hotel booking. status is CONFIRMED on success. hotelConfirmationCode
// may be null at booking time (Nuitee retrieves it from the hotel afterwards).
public record HotelBookResultDto(
        String bookingId,
        String status,
        String hotelConfirmationCode,
        String checkin,
        String checkout,
        double price,
        String currency
) {}