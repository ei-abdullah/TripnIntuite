package com.abdullah.api.trip.dto;

// Primary contact for a flight booking — receives confirmation emails.
// Mirrors LiteAPI's flight prebook `contact` object; field names match so it
// serializes straight into the outbound request. Null optionals are dropped by
// the non_null Jackson config.
public record ContactDto(
        String email,
        String firstName,
        String lastName,
        String middleName,
        String phoneCountryCode,
        String phoneNumber
) {}