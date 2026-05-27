"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {orderedPicks, useTripStore} from "../lib/tripStore";
import {legDateRanges} from "../lib/schedule";
import {fmtDateLong, fmtISO, fmtRange} from "../lib/dates";
import {type FlightOption, getFlightsForLeg} from "../lib/api";
import LegCard from "../components/LegCard";
import ReturnFlightCard from "../components/ReturnFlightCard";

export default function TripPage() {
  const router = useRouter();
  const intuitions = useTripStore((s) => s.intuitions);
  const picksRecord = useTripStore((s) => s.picks);
  const departure = useTripStore((s) => s.departure);
  const days = useTripStore((s) => s.days);
  const departureAirport = useTripStore((s) => s.departureAirport);

  const picks = useMemo(
    () => orderedPicks(intuitions, picksRecord),
    [intuitions, picksRecord],
  );

  // null = still loading, [] = loaded with zero results
  const [flightsPerLeg, setFlightsPerLeg] = useState<(FlightOption[] | null)[]>(
    [],
  );
  const [returnFlights, setReturnFlights] = useState<FlightOption[] | null>(
    null,
  );

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

  // Kick off N parallel flight fetches when ready. Each leg fills its own slot
  // as it resolves — progressive rendering.
  useEffect(() => {
    if (!homeIata || picks.length === 0 || ranges.length === 0) return;

    // Seed N+1 null slots — N legs + return
    setFlightsPerLeg(picks.map(() => null));
    setReturnFlights(null);

    picks.forEach((p, i) => {
      const from = i === 0 ? homeIata : picks[i - 1].airport;
      const to = p.airport;
      const date = fmtISO(ranges[i].arrive);
      getFlightsForLeg(from, to, date)
        .then((res) => {
          setFlightsPerLeg((prev) => {
            const next = [...prev];
            next[i] = res.options;
            return next;
          });
        })
        .catch(() => {
          setFlightsPerLeg((prev) => {
            const next = [...prev];
            next[i] = [];
            return next;
          });
        });
    });

    const last = picks[picks.length - 1];
    const lastRange = ranges[ranges.length - 1];
    getFlightsForLeg(last.airport, homeIata, fmtISO(lastRange.leave))
      .then((res) => setReturnFlights(res.options))
      .catch(() => setReturnFlights([]));
  }, [homeIata, picks, ranges]);

  if (picks.length === 0 || days.length !== picks.length) return null;

  const lastPick = picks[picks.length - 1];
  const lastRange = ranges[ranges.length - 1];

  return (
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Plan</Link>
            <span className="sep">/</span>
            <Link href="/plan">Schedule</Link>
            <span className="sep">/</span>
            <span>Itinerary</span>
          </div>
          <h2 className="serif">
            Your <em>itinerary</em>
          </h2>
        </div>
        <div className="eyebrow">
          {picks.length} legs · {days.reduce((a, b) => a + b, 0)} days
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
              flights={flightsPerLeg[i] ?? null}
              idx={i}
              total={picks.length}
            />
          );
        })}

        <ReturnFlightCard
          from={lastPick.airport}
          to={homeIata ?? "—"}
          dateLabel={fmtDateLong(lastRange.leave)}
          flights={returnFlights}
        />

        <div
          style={{
            padding: "56px 0 96px",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <button className="btn-accent">Confirm & book →</button>
          <Link className="btn-ghost" href="/plan">
            ← Adjust durations
          </Link>
        </div>
      </div>
    </main>
  );
}