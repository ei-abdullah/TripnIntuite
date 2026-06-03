package com.abdullah.api.trip.dto;

import java.util.List;

// Inbound request from checkout to book a flight. Carries the selected offer
// plus the traveller's contact + passenger details (kept for realism and so a
// real LiteAPI flight booking can be slotted in later without UI changes).
public record FlightBookRequest(
        String offerId,
        ContactDto contact,
        List<PassengerDto> passengers
) {}