"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useBookingsStore } from "../lib/bookingsStore";

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

// True only on the client after mount — avoids an SSR/hydration mismatch when
// reading the persisted (localStorage) bookings store.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function TripsPage() {
  const mounted = useMounted();
  const bookings = useBookingsStore((s) => s.bookings);

  return (
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Plan</Link>
            <span className="sep">/</span>
            <span>My trips</span>
          </div>
          <h2 className="serif">
            My <em>trips</em>
          </h2>
        </div>
        <div className="eyebrow">
          {mounted ? `${bookings.length} booked` : ""}
        </div>
      </div>

      {!mounted ? null : bookings.length === 0 ? (
        <div className="pt-8">
          <p className="max-w-prose text-sm text-(--muted)">
            You haven&apos;t booked any trips yet. Plan one and complete checkout
            to see it here.
          </p>
          <div className="pt-6">
            <Link className="btn-accent" href="/">
              Plan a trip →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 pt-8 sm:grid-cols-2">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/trips/${b.id}`}
              className="block rounded-sm border border-(--rule) bg-(--surface) p-5 transition-colors hover:border-(--ink)"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="serif text-lg text-(--ink)">{b.title}</h3>
                <span className="serif text-base text-(--ink)">
                  {money(b.flightsTotal + b.hotelsTotal, b.currency)}
                </span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-(--muted)">
                {new Date(b.createdAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="mt-3 text-sm text-(--ink-2)">
                {b.flights.length} flight{b.flights.length === 1 ? "" : "s"} ·{" "}
                {b.hotels.length} stay{b.hotels.length === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}