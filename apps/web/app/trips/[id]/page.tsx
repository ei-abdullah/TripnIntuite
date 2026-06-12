"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBookingsStore } from "../../lib/bookingsStore";

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

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function TripDetailPage() {
  const mounted = useMounted();
  const params = useParams<{ id: string }>();
  const booking = useBookingsStore((s) =>
    s.bookings.find((b) => b.id === params.id),
  );

  if (!mounted) return null;

  if (!booking) {
    return (
      <main className="container fade-in">
        <div className="page-head">
          <div>
            <div className="crumbs">
              <Link href="/trips">My trips</Link>
              <span className="sep">/</span>
              <span>Not found</span>
            </div>
            <h2 className="serif">
              Trip <em>not found</em>
            </h2>
          </div>
        </div>
        <div className="pt-8">
          <Link className="btn-accent" href="/trips">
            ← All trips
          </Link>
        </div>
      </main>
    );
  }

  const total = booking.flightsTotal + booking.hotelsTotal;

  return (
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/trips">My trips</Link>
            <span className="sep">/</span>
            <span>{booking.title}</span>
          </div>
          <h2 className="serif">
            You&apos;re <em>booked</em> ✓
          </h2>
        </div>
        <div className="eyebrow">
          {new Date(booking.createdAt).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>

      <p className="max-w-prose pt-3 text-sm text-(--muted)">
        {booking.title} · departing from {booking.homeIata}. Your confirmation
        details are below.
      </p>

      <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          {booking.flights.length > 0 && (
            <section>
              <h3 className="serif text-lg text-(--ink)">Flights</h3>
              <div className="mt-3 flex flex-col gap-3">
                {booking.flights.map((f) => (
                  <div
                    key={f.key}
                    className="rounded-sm border border-(--rule) bg-(--surface) p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-(--muted)">
                        {f.label}
                      </span>
                      <span className="serif text-sm text-(--ink)">
                        {money(f.price, f.currency)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-(--ink-2)">
                      {f.carrierName} · {f.route}
                    </div>
                    <div className="mt-1 text-xs text-[#166534]">
                      ✓ Confirmed · Ref {f.bookingRef}
                      {f.simulated ? " · sandbox" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {booking.hotels.length > 0 && (
            <section>
              <h3 className="serif text-lg text-(--ink)">Stays</h3>
              <div className="mt-3 flex flex-col gap-3">
                {booking.hotels.map((h) => (
                  <div
                    key={h.key}
                    className="rounded-sm border border-(--rule) bg-(--surface) p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-(--muted)">
                        {h.label}
                      </span>
                      <span className="serif text-sm text-(--ink)">
                        {money(h.price, h.currency)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-(--ink-2)">{h.name}</div>
                    <div className="text-xs text-(--muted)">{h.dates}</div>
                    <div className="mt-1 text-xs text-[#166534]">
                      ✓ {h.status} · Ref {h.bookingId}
                      {h.hotelConfirmationCode
                        ? ` · ${h.hotelConfirmationCode}`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link className="btn-ghost" href="/trips">
              ← All trips
            </Link>
            <Link className="btn-ghost" href="/">
              Plan another trip
            </Link>
          </div>
        </div>

        <aside className="h-fit rounded-sm border border-(--rule) bg-(--surface) p-5 lg:sticky lg:top-6">
          <h3 className="serif text-lg text-(--ink)">Total paid</h3>
          <div className="mt-4 flex flex-col gap-1.5 text-sm">
            {booking.flights.length > 0 && (
              <div className="flex items-baseline justify-between text-(--ink-2)">
                <span className="text-(--muted)">Flights</span>
                <span>{money(booking.flightsTotal, booking.currency)}</span>
              </div>
            )}
            {booking.hotels.length > 0 && (
              <div className="flex items-baseline justify-between text-(--ink-2)">
                <span className="text-(--muted)">Stays</span>
                <span>{money(booking.hotelsTotal, booking.currency)}</span>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-(--rule-strong) pt-3">
              <span className="text-[11px] uppercase tracking-[0.16em] text-(--ink)">
                Total
              </span>
              <span className="serif text-xl text-(--ink)">
                {money(total, booking.currency)}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-(--muted)">
            A confirmation has been recorded for this trip. Flight bookings are
            sandbox-simulated.
          </p>
        </aside>
      </div>
    </main>
  );
}