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
        int reviewCount
) {}