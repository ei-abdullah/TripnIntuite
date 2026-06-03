package com.abdullah.api.trip.dto;

/** One gallery image for a hotel. {@code url} is the best available (HD if present). */
public record HotelImageDto(String url, String caption) {}