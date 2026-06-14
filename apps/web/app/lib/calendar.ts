import type { TripBooking } from "./bookingsStore";

// Build Google Calendar "add event" template URLs from a booked trip. No OAuth:
// these are plain prefilled links the user clicks to drop a flight or stay into
// their own calendar. The backend emails the equivalent .ics; this is the
// in-app, one-click counterpart.

// "2026-07-01T08:30:00..." -> "20260701T083000" (floating local time).
// allDay -> "20260701" (date only).
function gcalDate(iso: string | undefined, allDay = false): string | null {
  if (!iso || iso.length < 10) return null;
  const date = iso.slice(0, 10).replace(/-/g, "");
  if (allDay) return date;
  const time = iso.length >= 19 ? iso.slice(11, 19).replace(/:/g, "") : "000000";
  return `${date}T${time}`;
}

function buildUrl(opts: {
  title: string;
  start: string;
  end: string;
  details?: string;
}): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${opts.start}/${opts.end}`,
  });
  if (opts.details) params.set("details", opts.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export type CalendarLink = { key: string; label: string; url: string };

export function calendarLinksForBooking(b: TripBooking): CalendarLink[] {
  const links: CalendarLink[] = [];

  for (const f of b.flights) {
    const start = gcalDate(f.departISO);
    if (!start) continue;
    // Fall back to a 2h block when no arrival time is known.
    const end = gcalDate(f.arriveISO) ?? start;
    links.push({
      key: f.key,
      label: `✈ ${f.route}`,
      url: buildUrl({
        title: `Flight ${f.route} — ${f.carrierName}`,
        start,
        end,
        details: `${f.label} · Booking ref ${f.bookingRef} · TripnIntuite`,
      }),
    });
  }

  for (const h of b.hotels) {
    const start = gcalDate(h.checkinISO, true);
    if (!start) continue;
    const end = gcalDate(h.checkoutISO, true) ?? start;
    const ref = h.hotelConfirmationCode || h.bookingId;
    links.push({
      key: h.key,
      label: `🏨 ${h.name}`,
      url: buildUrl({
        title: `Stay — ${h.name}`,
        start,
        end,
        details: `${h.label} · Confirmation ${ref} · TripnIntuite`,
      }),
    });
  }

  return links;
}