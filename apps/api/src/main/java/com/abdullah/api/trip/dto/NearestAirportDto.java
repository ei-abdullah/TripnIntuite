package com.abdullah.api.trip.dto;

public record NearestAirportDto(
        String id,
        String name,
        String formattedAddress,
        double latitude,
        double longitude
        ) {

}
