import type {Destination} from "./data";
import {addDays, parseDate} from "./dates";

export type ScheduleEvent = {
  type: "fly" | "arrive" | "home";
  title: string;
  sub: string;
  date: Date;
  airport?: string;
  dest?: Destination;
  fromDest?: Destination;
  toDest?: Destination;
  ret?: boolean;
};

export function buildSchedule(
  departureISO: string,
  picks: Destination[],
  daysByLeg: number[],
  homeAirport: string = "home",
): ScheduleEvent[] {
  const dep = parseDate(departureISO);
  const events: ScheduleEvent[] = [];
  let cursor = dep;
  events.push({
    type: "fly",
    title: `Depart ${homeAirport}`,
    sub: "From home",
    date: cursor,
    airport: homeAirport,
  });
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const stay = Math.max(1, daysByLeg[i] || 3);
    events.push({
      type: "arrive",
      title: `Arrive ${p.name}`,
      sub: `${p.country} · ${p.airport}`,
      date: cursor,
      dest: p,
    });
    const endStay = addDays(cursor, stay);
    if (i < picks.length - 1) {
      const next = picks[i + 1];
      events.push({
        type: "fly",
        title: `Fly ${p.name} → ${next.name}`,
        sub: `${p.airport} → ${next.airport}`,
        date: endStay,
        fromDest: p,
        toDest: next,
      });
    } else {
      events.push({
        type: "fly",
        title: `Return to ${homeAirport}`,
        sub: `${p.airport} → ${homeAirport}`,
        date: endStay,
        fromDest: p,
        airport: homeAirport,
        ret: true,
      });
      events.push({
        type: "home",
        title: `Arrive home`,
        sub: homeAirport,
        date: endStay,
      });
    }
    cursor = endStay;
  }
  return events;
}

export type LegRange = { arrive: Date; leave: Date; stay: number };

export function legDateRanges(
  departureISO: string,
  picks: Destination[],
  daysByLeg: number[],
): LegRange[] {
  const start = parseDate(departureISO);
  const ranges: LegRange[] = [];
  let cursor = start;
  for (let i = 0; i < picks.length; i++) {
    const arrive = cursor;
    const stay = Math.max(1, daysByLeg[i] || 3);
    const leave = addDays(arrive, stay);
    ranges.push({ arrive, leave, stay });
    cursor = leave;
  }
  return ranges;
}