package com.abdullah.api.trip.dto;

// A person on a hotel booking — used for both the holder (payer) and each
// guest. Field names match LiteAPI's /rates/book payload. occupancyNumber is
// required by the API on each guest (which occupancy slot they fill); the
// service assigns it, so it's null/dropped for the holder.
public record GuestDto(
        String firstName,
        String lastName,
        String email,
        Integer occupancyNumber
) {}