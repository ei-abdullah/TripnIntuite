package com.abdullah.api.email;

import com.abdullah.api.trip.dto.ItineraryEmailRequest;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

// Builds an iCalendar (.ics) document for a booked trip: one VEVENT per flight
// (timed, floating local time) and one per hotel stay (all-day, checkin→checkout).
// Attached to the confirmation email so the trip lands straight in the inbox's
// calendar. No external library — the format is small and stable.
public final class IcsBuilder {

    private IcsBuilder() {}

    private static final String CRLF = "\r\n";
    private static final DateTimeFormatter STAMP =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    public static String build(ItineraryEmailRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR").append(CRLF);
        sb.append("VERSION:2.0").append(CRLF);
        sb.append("PRODID:-//TripnIntuite//Trip Itinerary//EN").append(CRLF);
        sb.append("CALSCALE:GREGORIAN").append(CRLF);
        sb.append("METHOD:PUBLISH").append(CRLF);

        String stamp = ZonedDateTime.now(ZoneOffset.UTC).format(STAMP);
        int seq = 0;

        List<ItineraryEmailRequest.EmailFlight> flights =
                req.flights() != null ? req.flights() : List.of();
        for (ItineraryEmailRequest.EmailFlight f : flights) {
            String start = localDateTime(f.departISO());
            String end = localDateTime(f.arriveISO());
            if (start == null) continue;
            sb.append("BEGIN:VEVENT").append(CRLF);
            sb.append("UID:").append(uid(stamp, seq++)).append(CRLF);
            sb.append("DTSTAMP:").append(stamp).append(CRLF);
            sb.append("DTSTART:").append(start).append(CRLF);
            sb.append("DTEND:").append(end != null ? end : start).append(CRLF);
            sb.append("SUMMARY:").append(esc("✈ " + f.route()
                    + (f.carrierName() != null ? " · " + f.carrierName() : ""))).append(CRLF);
            sb.append("DESCRIPTION:").append(esc(
                    (f.label() != null ? f.label() + " — " : "")
                            + "Booking ref " + nv(f.bookingRef()) + " · TripnIntuite")).append(CRLF);
            sb.append("END:VEVENT").append(CRLF);
        }

        List<ItineraryEmailRequest.EmailHotel> hotels =
                req.hotels() != null ? req.hotels() : List.of();
        for (ItineraryEmailRequest.EmailHotel h : hotels) {
            String start = localDate(h.checkinISO());
            String end = localDate(h.checkoutISO());
            if (start == null) continue;
            sb.append("BEGIN:VEVENT").append(CRLF);
            sb.append("UID:").append(uid(stamp, seq++)).append(CRLF);
            sb.append("DTSTAMP:").append(stamp).append(CRLF);
            sb.append("DTSTART;VALUE=DATE:").append(start).append(CRLF);
            sb.append("DTEND;VALUE=DATE:").append(end != null ? end : start).append(CRLF);
            sb.append("SUMMARY:").append(esc("🏨 " + nv(h.name()))).append(CRLF);
            sb.append("DESCRIPTION:").append(esc(
                    (h.label() != null ? h.label() + " — " : "")
                            + "Confirmation "
                            + (h.hotelConfirmationCode() != null ? h.hotelConfirmationCode() : nv(h.bookingId()))
                            + " · TripnIntuite")).append(CRLF);
            sb.append("END:VEVENT").append(CRLF);
        }

        sb.append("END:VCALENDAR").append(CRLF);
        return sb.toString();
    }

    private static String uid(String stamp, int seq) {
        return stamp + "-" + seq + "@tripnintuite";
    }

    // "2026-07-01T08:30:00..." -> "20260701T083000" (floating local time, no TZ).
    private static String localDateTime(String iso) {
        if (iso == null || iso.length() < 10) return null;
        String date = iso.substring(0, 10).replace("-", "");
        String time = "000000";
        if (iso.length() >= 19) {
            time = iso.substring(11, 19).replace(":", "");
        }
        return date + "T" + time;
    }

    // "2026-07-01" -> "20260701" (date only, for all-day events).
    private static String localDate(String iso) {
        if (iso == null || iso.length() < 10) return null;
        return iso.substring(0, 10).replace("-", "");
    }

    // iCalendar TEXT escaping: backslash, semicolon, comma, newline.
    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\n", "\\n");
    }

    private static String nv(String s) {
        return s != null ? s : "";
    }
}