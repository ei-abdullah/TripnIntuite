"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { orderedPicks, useTripStore } from "../lib/tripStore";
import { AIRLINES_BY_DEST } from "../lib/data";
import { legDateRanges, HOME_AIRPORT } from "../lib/schedule";
import { fmtDateLong, fmtRange } from "../lib/dates";
import LegCard from "../components/LegCard";
import ReturnFlightCard from "../components/ReturnFlightCard";

export default function TripPage() {
  const router = useRouter();
  const intuitions = useTripStore((s) => s.intuitions);
  const picksRecord = useTripStore((s) => s.picks);
  const departure = useTripStore((s) => s.departure);
  const days = useTripStore((s) => s.days);

  const picks = useMemo(
    () => orderedPicks(intuitions, picksRecord),
    [intuitions, picksRecord],
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

  if (picks.length === 0 || days.length !== picks.length) return null;

  const ranges = legDateRanges(departure, picks, days);
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

      <div style={{ paddingTop: 32 }}>
        {picks.map((p, i) => {
          const prev = i === 0 ? null : picks[i - 1];
          const from = i === 0 ? HOME_AIRPORT : prev!.airport;
          const to = p.airport;
          const flightDate = ranges[i].arrive;
          const airlines =
            AIRLINES_BY_DEST[p.id] || AIRLINES_BY_DEST.tromso;
          return (
            <LegCard
              key={p.id}
              leg={p}
              prevDest={prev}
              from={from}
              to={to}
              dateRange={fmtRange(ranges[i].arrive, ranges[i].leave)}
              flightDateLabel={fmtDateLong(flightDate)}
              airlines={airlines}
              idx={i}
              total={picks.length}
            />
          );
        })}

        <ReturnFlightCard
          from={lastPick.airport}
          to={HOME_AIRPORT}
          dateLabel={fmtDateLong(lastRange.leave)}
          airlines={
            AIRLINES_BY_DEST[lastPick.id] || AIRLINES_BY_DEST.tromso
          }
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
