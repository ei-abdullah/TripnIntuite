"use client";

import {useEffect, useMemo} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {orderedPicks, useTripStore} from "../lib/tripStore";
import {buildSchedule, HOME_AIRPORT} from "../lib/schedule";
import {fmtDateLong} from "../lib/dates";

export default function PlanPage() {
  const router = useRouter();
  const intuitions = useTripStore((s) => s.intuitions);
  const picksRecord = useTripStore((s) => s.picks);
  const departure = useTripStore((s) => s.departure);
  const days = useTripStore((s) => s.days);
  const setDeparture = useTripStore((s) => s.setDeparture);
  const setDay = useTripStore((s) => s.setDay);
  const initDaysIfEmpty = useTripStore((s) => s.initDaysIfEmpty);

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
    initDaysIfEmpty(picks.length);
  }, [intuitions.length, picks.length, router, initDaysIfEmpty]);

  const schedule = useMemo(
    () => buildSchedule(departure, picks, days, HOME_AIRPORT),
    [departure, picks, days],
  );

  if (picks.length === 0 || days.length !== picks.length) return null;

  const totalDays = days.reduce((a, b) => a + b, 0);

  return (
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Plan</Link>
            <span className="sep">/</span>
            <Link href="/select">Locations</Link>
            <span className="sep">/</span>
            <span>Schedule</span>
          </div>
          <h2 className="serif">
            Set <em>one date</em>. We compute the rest.
          </h2>
        </div>
        <div className="eyebrow">
          {picks.length} legs · {totalDays} days · 1 return
        </div>
      </div>

      <div className="plan-grid">
        <div>
          <div className="plan-head">
            <div className="lab">Departure</div>
            <h3 className="serif">
              When do you leave <em>{HOME_AIRPORT}</em>?
            </h3>
          </div>
          <div className="date-field">
            <span className="lab">Date</span>
            <input
              type="date"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
            />
          </div>

          <div className="legs-stack" style={{ marginTop: 44 }}>
            <div className="plan-head">
              <div className="lab">Stay durations</div>
              <h3 className="serif">
                How long in <em>each</em>?
              </h3>
            </div>
            <div style={{ marginTop: 24 }}>
              {picks.map((p, i) => (
                <div key={p.id} className="leg-tile">
                  <div className="legno serif">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    className="thumb"
                    style={{ backgroundImage: `url(${p.img})` }}
                  ></div>
                  <div>
                    <div className="name serif">{p.name}</div>
                    <div className="country">{p.country}</div>
                  </div>
                  <div className="days-ctrl">
                    <button
                      className="btn"
                      onClick={() => setDay(i, days[i] - 1)}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <div>
                      <div className="val serif num">{days[i]}</div>
                      <small>{days[i] === 1 ? "day" : "days"}</small>
                    </div>
                    <button
                      className="btn"
                      onClick={() => setDay(i, days[i] + 1)}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="plan-head">
            <div className="lab">Computed schedule</div>
            <h3 className="serif">
              Your full <em>itinerary</em>, to the day.
            </h3>
          </div>

          <div className="timeline" style={{ marginTop: 28 }}>
            <div className="lab">Timeline</div>
            <ul>
              {schedule.map((e, i) => (
                <li key={i} className={e.type}>
                  <div className="what serif">
                    {e.title}
                    <small>{e.sub}</small>
                  </div>
                  <div className="when num">{fmtDateLong(e.date)}</div>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 36,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-accent"
              onClick={() => router.push("/trip")}
            >
              Build itinerary <span>→</span>
            </button>
            <Link className="btn-ghost" href="/select">
              ← Edit locations
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
