package com.abdullah.api.trip.dto;

import java.util.List;

/**
 * One bookable room offer for a hotel, flattened from a roomType in the
 * LiteAPI rates response. {@code totalAmount} is the all-in price for the whole
 * stay (the offer's retail rate), not per night.
 */
public record RoomOfferDto(
        String offerId,
        String name,
        String boardName,
        double totalAmount,
        double suggestedPrice,
        String currency,
        boolean refundable,
        String cancellationDeadline,
        int maxOccupancy,
        List<String> perks
) {}