package com.abdullah.api.trip.dto;

import java.util.List;

// Inbound request from checkout to finalize a hotel booking. The service adds
// payment { method: ACC_CREDIT_CARD } (sandbox — simulated payment, no charge).
public record HotelBookRequest(
        String prebookId,
        GuestDto holder,
        List<GuestDto> guests
) {}