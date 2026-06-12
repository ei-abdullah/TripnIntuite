package com.abdullah.api.trip.dto;

import java.util.List;

// Inbound request to email a booked itinerary. The frontend is the source of
// truth for bookings (the DB is create-drop), so it posts the whole assembled
// trip here. Drives both the confirmation email (auto, on checkout) and the
// on-demand "email itinerary" resend, plus the attached .ics calendar file.
public record ItineraryEmailRequest(
        String to,
        String title,
        String homeIata,
        String currency,
        double flightsTotal,
        double hotelsTotal,
        List<EmailFlight> flights,
        List<EmailHotel> hotels
) {
    public record EmailFlight(
            String label,
            String route,
            String carrierName,
            double price,
            String currency,
            String bookingRef,
            String departISO,
            String arriveISO
    ) {}

    public record EmailHotel(
            String label,
            String name,
            String dates,
            double price,
            String currency,
            String bookingId,
            String hotelConfirmationCode,
            String checkinISO,
            String checkoutISO
    ) {}
}