package com.abdullah.api.trip.dto;

import java.util.List;

/**
 * Rich, content-only details for a single hotel, sourced from
 * GET /v3.0/data/hotel. Pricing/rooms are NOT here — those come from the rates
 * endpoint. Drives the detail drawer's media gallery and info sections.
 */
public record HotelDetailsDto(
        String hotelId,
        String name,
        String description,
        String importantInfo,
        String videoUrl,
        List<HotelImageDto> images,
        List<String> facilities,
        String checkinTime,
        String checkoutTime,
        String chain,
        String hotelType,
        String address,
        String phone,
        String email,
        Boolean parking,
        Boolean petsAllowed,
        Boolean childAllowed,
        List<HotelPolicyDto> policies
) {}