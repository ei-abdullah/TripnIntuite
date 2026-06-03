package com.abdullah.api.trip.dto;

/** Body for POST /api/trip/hotels/prebook. The offerId comes from a room rate. */
public record PrebookRequest(String offerId) {}