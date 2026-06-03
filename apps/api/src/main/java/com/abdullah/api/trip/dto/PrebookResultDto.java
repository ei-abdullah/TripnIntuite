package com.abdullah.api.trip.dto;

import java.util.List;

/**
 * Result of a LiteAPI prebook (checkout session). The {@code prebookId} feeds
 * the book step. The three "changed" flags must be checked before booking:
 * a non-zero {@code priceDifferencePercent}, or {@code cancellationChanged} /
 * {@code boardChanged} true, means the rate shifted since the offer was shown.
 */
public record PrebookResultDto(
        String prebookId,
        String offerId,
        String hotelId,
        String checkin,
        String checkout,
        String currency,
        double price,
        int priceDifferencePercent,
        boolean cancellationChanged,
        boolean boardChanged,
        String termsAndConditions,
        List<String> paymentTypes
) {}