package com.abdullah.api.trip.dto;

// A single traveller on a flight prebook. Field names match LiteAPI's
// `passengers[]` object so it serializes straight through. Document fields are
// optional (collected behind a collapsible on the checkout screen); null
// optionals are dropped by the non_null Jackson config.
// passengerType: 0 = adult, 1 = child, 2 = infant. gender: "M" or "F".
public record PassengerDto(
        String firstName,
        String lastName,
        String middleName,
        String gender,
        String birthday,
        String nationality,
        Integer passengerType,
        String documentType,
        String documentNumber,
        String documentExpiry,
        String documentIssueCountry
) {}