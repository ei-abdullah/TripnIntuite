"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {orderedPicks, useTripStore} from "../lib/tripStore";
import {legDateRanges} from "../lib/schedule";
import {fmtDateLong, fmtISO, fmtRange} from "../lib/dates";
import {type FlightOption, getFlightsForLeg, getHotelsForLeg, type HotelOption} from "../lib/api";
import {APIProvider} from "@vis.gl/react-google-maps";
import LegCard from "../components/LegCard";
import ReturnFlightCard from "../components/ReturnFlightCard";
import BookingsDrawer, {type BookingEntry} from "../components/BookingsDrawer";

const MAPS_KEY = "YOUR_API_KEY";

export default function TripPage() {
  const router = useRouter();
  const intuitions = useTripStore((s) => s.intuitions);
  const picksRecord = useTripStore((s) => s.picks);
  const departure = useTripStore((s) => s.departure);
  const days = useTripStore((s) => s.days);
  const departureAirport = useTripStore((s) => s.departureAirport);
  const reservations = useTripStore((s) => s.reservations);
  const reserveHotel = useTripStore((s) => s.reserveHotel);
  const clearReservation = useTripStore((s) => s.clearReservation);
  const setOrderFlights = useTripStore((s) => s.setOrderFlights);

  const picks = useMemo(
    () => orderedPicks(intuitions, picksRecord),
    [intuitions, picksRecord],
  );

  // null = still loading, [] = loaded with zero results
  const [flightsPerLeg, setFlightsPerLeg] = useState<(FlightOption[] | null)[]>(
    [],
  );
  const [hotelsPerLeg, setHotelsPerLeg] = useState<(HotelOption[] | null)[]>(
    [],
  );
  const [returnFlights, setReturnFlights] = useState<FlightOption[] | null>(
    null,
  );
  // Selected flight index per leg (keyed by leg id) + the return flight, lifted
  // out of the cards so "Confirm & book" can snapshot the full order.
  const [flightSel, setFlightSel] = useState<Record<string, number>>({});
  const [returnSel, setReturnSel] = useState(0);
  const [bookingsOpen, setBookingsOpen] = useState(false);

  useEffect(() => {
    if (intuitions.length === 0) {
      router.replace("/");
      return;
    }
    if (picks.length < intuitions.length) {
      router.replace("/select");
      return;
    }
    if (days.length !== picks.length) {
      router.replace("/plan");
    }
  }, [intuitions.length, picks.length, days.length, router]);

  const homeIata = departureAirport?.iataCode ?? null;
  const ranges = useMemo(
    () =>
      picks.length === days.length ? legDateRanges(departure, picks, days) : [],
    [departure, picks, days],
  );

  // Load one leg at a time: flight + hotel for leg 1, then leg 2, and so on,
  // finishing with the return flight. LiteAPI 429s if every leg fires at once,
  // so we keep it sequential — each leg's results render as they arrive.
  useEffect(() => {
    if (!homeIata || picks.length === 0 || ranges.length === 0) return;

    let cancelled = false;
    setFlightsPerLeg(Array(picks.length).fill(null));
    setHotelsPerLeg(Array(picks.length).fill(null));
    setReturnFlights(null);

    (async () => {
      for (let i = 0; i < picks.length; i++) {
        if (cancelled) return;
        const p = picks[i];
        const from = i === 0 ? homeIata : picks[i - 1].airport;
        const arrive = fmtISO(ranges[i].arrive);

        const [flights, hotels] = await Promise.all([
          getFlightsForLeg(from, p.airport, arrive)
            .then((r) => r.options)
            .catch(() => []),
          getHotelsForLeg(p.latitude, p.longitude, arrive, fmtISO(ranges[i].leave))
            .then((r) => r.hotels)
            .catch(() => []),
        ]);
        if (cancelled) return;
        setFlightsPerLeg((prev) => prev.map((v, j) => (j === i ? flights : v)));
        setHotelsPerLeg((prev) => prev.map((v, j) => (j === i ? hotels : v)));
      }

      if (cancelled) return;
      const last = picks[picks.length - 1];
      const lastRange = ranges[ranges.length - 1];
      const ret = await getFlightsForLeg(last.airport, homeIata, fmtISO(lastRange.leave))
        .then((r) => r.options)
        .catch(() => []);
      if (!cancelled) setReturnFlights(ret);
    })();

    return () => {
      cancelled = true;
    };
  }, [homeIata, picks, ranges]);

  if (picks.length === 0 || days.length !== picks.length) return null;

  const lastPick = picks[picks.length - 1];
  const lastRange = ranges[ranges.length - 1];

  const bookings: BookingEntry[] = picks.flatMap((p, i) => {
    const r = reservations[p.id];
    if (!r || !ranges[i]) return [];
    return [
      {
        legId: p.id,
        legName: `Leg ${i + 1} · ${p.name}, ${p.country}`,
        checkin: fmtISO(ranges[i].arrive),
        checkout: fmtISO(ranges[i].leave),
        hotel: r.hotel,
        data: r.data,
      },
    ];
  });

  // Snapshot the currently-selected flights into the store, then head to
  // checkout where they're prebooked alongside the reserved hotels.
  const confirmAndBook = () => {
    const selected: Record<string, FlightOption> = {};
    picks.forEach((p, i) => {
      const opts = flightsPerLeg[i];
      if (opts && opts.length > 0) {
        selected[p.id] = opts[Math.min(flightSel[p.id] ?? 0, opts.length - 1)];
      }
    });
    const ret =
      returnFlights && returnFlights.length > 0
        ? returnFlights[Math.min(returnSel, returnFlights.length - 1)]
        : null;
    setOrderFlights(selected, ret);
    router.push("/checkout");
  };

  return (
    <APIProvider apiKey={MAPS_KEY}>
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Plan</Link>
            <span className="sep">/</span>
            <Link href="/plan">Schedule</Link>
            <span className="sep">/</span>
            <span>Itinerary</span>
            <span className="sep">/</span>
            <Link href="/trips">My trips</Link>
          </div>
          <h2 className="serif">
            Your <em>itinerary</em>
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div className="eyebrow">
            {picks.length} legs · {days.reduce((a, b) => a + b, 0)} days
          </div>
          <button
            type="button"
            onClick={() => setBookingsOpen(true)}
            className="rounded-sm border border-(--rule-strong) bg-(--surface) px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] text-(--ink) transition-colors hover:border-(--ink)"
          >
            Your bookings{bookings.length > 0 ? ` (${bookings.length})` : ""}
          </button>
        </div>
      </div>

      {!homeIata && (
        <div
          style={{
            padding: "16px 0",
            color: "var(--accent)",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}
        >
          Detect your home airport on the home page to load flights.
        </div>
      )}

      <div style={{ paddingTop: 32 }}>
        {picks.map((p, i) => {
          const prev = i === 0 ? null : picks[i - 1];
          const from = i === 0 ? homeIata ?? "—" : prev!.airport;
          const to = p.airport;
          const flightDate = ranges[i].arrive;
          return (
            <LegCard
              key={p.id}
              leg={p}
              prevDest={prev}
              from={from}
              to={to}
              dateRange={fmtRange(ranges[i].arrive, ranges[i].leave)}
              flightDateLabel={fmtDateLong(flightDate)}
              checkinISO={fmtISO(ranges[i].arrive)}
              checkoutISO={fmtISO(ranges[i].leave)}
              flights={flightsPerLeg[i] ?? null}
              hotels={hotelsPerLeg[i] ?? null}
              idx={i}
              total={picks.length}
              flightSel={flightSel[p.id] ?? 0}
              onFlightSel={(index) =>
                setFlightSel((s) => ({ ...s, [p.id]: index }))
              }
              reservation={reservations[p.id] ?? null}
              onReserved={(hotel, data) => reserveHotel(p.id, hotel, data)}
              onClearReservation={() => clearReservation(p.id)}
            />
          );
        })}

        <ReturnFlightCard
          from={lastPick.airport}
          to={homeIata ?? "—"}
          dateLabel={fmtDateLong(lastRange.leave)}
          flights={returnFlights}
          sel={returnSel}
          onSel={setReturnSel}
        />

        <div
          style={{
            padding: "56px 0 96px",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn-accent"
            onClick={confirmAndBook}
          >
            Confirm & book →
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setBookingsOpen(true)}
          >
            Your bookings{bookings.length > 0 ? ` (${bookings.length})` : ""}
          </button>
          <Link className="btn-ghost" href="/plan">
            ← Adjust durations
          </Link>
        </div>
      </div>

      <BookingsDrawer
        open={bookingsOpen}
        bookings={bookings}
        onRemove={clearReservation}
        onClose={() => setBookingsOpen(false)}
      />
    </main>
    </APIProvider>
  );
}