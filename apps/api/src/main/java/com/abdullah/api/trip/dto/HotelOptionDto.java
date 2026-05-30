package com.abdullah.api.trip.dto;

public record HotelOptionDto(
        String id,
        String name,
        String description,
        String chain,
        String address,
        String city,
        String country,
        double latitude,
        double longitude,
        String mainPhoto,
        String thumbnail,
        int stars,
        double rating,
        int reviewCount,
        // Availability + cheapest price for the requested dates. When available
        // is false the price fields are 0 (shown as "rates on request").
        boolean available,
        double totalPrice,
        String currency,
        int nights
) {}