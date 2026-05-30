package com.abdullah.api.trip.dto;

import java.util.List;

/**
 * Pricing for a single hotel over a date range, fetched lazily when the user
 * opens the hotel detail drawer. {@code rooms} is sorted cheapest-first.
 */
public record HotelRatesDto(
        String hotelId,
        String checkin,
        String checkout,
        int nights,
        String currency,
        List<RoomOfferDto> rooms
) {}