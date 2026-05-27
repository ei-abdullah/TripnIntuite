package com.abdullah.api.trip.dto;

import java.util.List;

public record LegResultDto(
        String origin,
        String destination,
        String date,
        List<FlightOptionDto> options
) {}