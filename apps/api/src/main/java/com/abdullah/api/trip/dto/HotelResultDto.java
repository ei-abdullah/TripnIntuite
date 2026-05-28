package com.abdullah.api.trip.dto;

import java.util.List;

public record HotelResultDto(
        double latitude,
        double longitude,
        int radiusMeters,
        List<HotelOptionDto> hotels
) {}