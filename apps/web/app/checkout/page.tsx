"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { orderedPicks, useTripStore } from "../lib/tripStore";
import { useAuthStore } from "../lib/authStore";
import {
  useBookingsStore,
  type BookedFlight,
  type BookedHotel,
} from "../lib/bookingsStore";
import { fmtDuration } from "../lib/dates";
import {
  ApiError,
  bookFlight,
  bookHotel,
  sendItineraryEmail,
  type Contact,
  type FlightBookResult,
  type FlightOption,
  type Guest,
  type HotelBookResult,
  type Passenger,
} from "../lib/api";
import type { TripBooking } from "../lib/bookingsStore";

type FlightLine = { key: string; label: string; route: string; flight: FlightOption };
type HotelLine = {
  key: string;
  label: string;
  name: string;
  dates: string;
  price: number;
  currency: string;
  prebookId: string;
};

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

export default function CheckoutPage() {
  const intuitions = useTripStore((s) => s.intuitions);
  const picksRecord = useTripStore((s) => s.picks);
  const departureAirport = useTripStore((s) => s.departureAirport);
  const selectedFlights = useTripStore((s) => s.selectedFlights);
  const returnFlight = useTripStore((s) => s.returnFlight);
  const reservations = useTripStore((s) => s.reservations);
  const user = useAuthStore((s) => s.user);
  const addBooking = useBookingsStore((s) => s.addBooking);
  const router = useRouter();

  const picks = useMemo(
    () => orderedPicks(intuitions, picksRecord),
    [intuitions, picksRecord],
  );
  const homeIata = departureAirport?.iataCode ?? "home";

  const { flightLines, hotelLines } = useMemo(() => {
    const flightLines: FlightLine[] = [];
    const hotelLines: HotelLine[] = [];

    picks.forEach((p, i) => {
      const flight = selectedFlights[p.id];
      if (flight) {
        const from = i === 0 ? homeIata : picks[i - 1].airport;
        flightLines.push({
          key: `leg-${p.id}`,
          label: `Leg ${i + 1} · ${p.name}`,
          route: `${from} → ${p.airport}`,
          flight,
        });
      }
      const r = reservations[p.id];
      if (r) {
        hotelLines.push({
          key: `hotel-${p.id}`,
          label: `Stay · ${p.name}`,
          name: r.hotel.name,
          dates: `${r.data.checkin} → ${r.data.checkout}`,
          price: r.data.price,
          currency: r.data.currency,
          prebookId: r.data.prebookId,
        });
      }
    });

    if (returnFlight && picks.length > 0) {
      const last = picks[picks.length - 1];
      flightLines.push({
        key: "return",
        label: "Return · home",
        route: `${last.airport} → ${homeIata}`,
        flight: returnFlight,
      });
    }

    return { flightLines, hotelLines };
  }, [picks, homeIata, selectedFlights, returnFlight, reservations]);

  const flightsTotal = flightLines.reduce((sum, l) => sum + l.flight.price, 0);
  const hotelsTotal = hotelLines.reduce((sum, l) => sum + l.price, 0);
  const flightCurrency = flightLines[0]?.flight.currency ?? "USD";

  // ── traveller / contact form ──────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("M");
  const [birthday, setBirthday] = useState("");
  const [nationality, setNationality] = useState("");
  const [showDoc, setShowDoc] = useState(false);
  const [docType, setDocType] = useState("passport");
  const [docNumber, setDocNumber] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docCountry, setDocCountry] = useState("");

  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done">(
    "idle",
  );
  const [results, setResults] = useState<Record<string, FlightBookResult>>({});
  const [hotelResults, setHotelResults] = useState<Record<string, HotelBookResult>>(
    {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const hasFlights = flightLines.length > 0;
  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    !!phoneNumber.trim() &&
    (!hasFlights || !!birthday) &&
    (hasFlights || hotelLines.length > 0) &&
    submitState !== "submitting";

  async function handleSubmit() {
    if (!canSubmit) {
      setFormError("Please fill in the required traveller and contact fields.");
      return;
    }
    setFormError(null);
    setSubmitState("submitting");

    const contact: Contact = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneCountryCode: phoneCountryCode.trim() || undefined,
      phoneNumber: phoneNumber.trim(),
    };
    const passenger: Passenger = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      birthday,
      nationality: nationality.trim() || undefined,
      passengerType: 0,
      ...(showDoc && docNumber.trim()
        ? {
            documentType: docType,
            documentNumber: docNumber.trim(),
            documentExpiry: docExpiry || undefined,
            documentIssueCountry: docCountry.trim() || undefined,
          }
        : {}),
    };

    const holder: Guest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    };

    const nextResults: Record<string, FlightBookResult> = {};
    const nextHotelResults: Record<string, HotelBookResult> = {};
    const nextErrors: Record<string, string> = {};
    // Sequential — keeps us under LiteAPI's rate limit and lets each line
    // surface its own error.
    for (const line of flightLines) {
      try {
        nextResults[line.key] = await bookFlight({
          offerId: line.flight.offerId,
          contact,
          passengers: [passenger],
        });
      } catch (err) {
        nextErrors[line.key] =
          err instanceof ApiError ? err.message : "Couldn't book this flight.";
      }
    }
    // Hotels: finalize each prebooked room (sandbox ACC_CREDIT_CARD).
    for (const line of hotelLines) {
      try {
        nextHotelResults[line.key] = await bookHotel({
          prebookId: line.prebookId,
          holder,
          guests: [holder],
        });
      } catch (err) {
        nextErrors[line.key] =
          err instanceof ApiError ? err.message : "Couldn't complete this booking.";
      }
    }
    setResults(nextResults);
    setHotelResults(nextHotelResults);
    setErrors(nextErrors);
    setSubmitState("done");

    // Fully successful → persist the trip and head to the confirmation screen.
    // Any failure: stay here so the errors are visible and retryable.
    const failed = Object.keys(nextErrors).length;
    if (failed === 0) {
      const bookedFlights: BookedFlight[] = flightLines
        .filter((l) => nextResults[l.key])
        .map((l) => ({
          key: l.key,
          label: l.label,
          route: l.route,
          carrierName: l.flight.carrierName,
          price: l.flight.price,
          currency: l.flight.currency,
          bookingRef: nextResults[l.key].bookingRef,
          simulated: nextResults[l.key].simulated,
          departISO: l.flight.departureTime,
          arriveISO: l.flight.arrivalTime,
        }));
      const bookedHotels: BookedHotel[] = hotelLines
        .filter((l) => nextHotelResults[l.key])
        .map((l) => {
          const r = nextHotelResults[l.key];
          return {
            key: l.key,
            label: l.label,
            name: l.name,
            dates: l.dates,
            price: l.price,
            currency: l.currency,
            bookingId: r.bookingId,
            status: r.status,
            hotelConfirmationCode: r.hotelConfirmationCode,
            checkinISO: r.checkin,
            checkoutISO: r.checkout,
          };
        });

      if (bookedFlights.length + bookedHotels.length > 0) {
        const id = crypto.randomUUID();
        const booking: TripBooking = {
          id,
          createdAt: new Date().toISOString(),
          title: picks.map((p) => p.name).join(" → ") || "Your trip",
          homeIata,
          flights: bookedFlights,
          hotels: bookedHotels,
          flightsTotal: bookedFlights.reduce((s, f) => s + f.price, 0),
          hotelsTotal: bookedHotels.reduce((s, h) => s + h.price, 0),
          currency: flightCurrency,
          contactEmail: email.trim(),
        };
        addBooking(booking);
        // Fire the confirmation email (best-effort — never block the redirect).
        void sendItineraryEmail(booking, email.trim()).catch(() => {});
        router.push(`/trips/${id}`);
      }
    }
  }

  const isEmpty = flightLines.length === 0 && hotelLines.length === 0;

  if (isEmpty) {
    return (
      <main className="container fade-in">
        <div className="page-head">
          <div>
            <div className="crumbs">
              <Link href="/trip">Itinerary</Link>
              <span className="sep">/</span>
              <span>Checkout</span>
            </div>
            <h2 className="serif">
              Nothing to <em>check out</em>
            </h2>
          </div>
        </div>
        <p className="max-w-prose pt-4 text-sm text-(--muted)">
          Pick your flights and reserve your hotels first, then come back to
          complete your booking.
        </p>
        <div className="pt-8">
          <Link className="btn-accent" href="/trip">
            ← Back to itinerary
          </Link>
        </div>
      </main>
    );
  }

  const bookedCount =
    Object.keys(results).length + Object.keys(hotelResults).length;
  const failedCount = Object.keys(errors).length;

  return (
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/trip">Itinerary</Link>
            <span className="sep">/</span>
            <span>Checkout</span>
          </div>
          <h2 className="serif">
            Complete your <em>booking</em>
          </h2>
        </div>
        <div className="eyebrow">
          {flightLines.length} flight{flightLines.length === 1 ? "" : "s"} ·{" "}
          {hotelLines.length} stay{hotelLines.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_360px]">
        {/* ── form ─────────────────────────────────────────── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex flex-col gap-10"
        >
          <Section title="Traveller" sub="As shown on your travel document">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={setFirstName} placeholder="John" />
              </Field>
              <Field label="Last name" required>
                <Input value={lastName} onChange={setLastName} placeholder="Doe" />
              </Field>
              <Field label="Date of birth" required>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputCls}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </Field>
              <Field label="Nationality (ISO)">
                <Input
                  value={nationality}
                  onChange={(v) => setNationality(v.toUpperCase().slice(0, 2))}
                  placeholder="US"
                />
              </Field>
            </div>
          </Section>

          <Section title="Contact" sub="We send the confirmation here">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-[80px_1fr] gap-4">
                <Field label="Code">
                  <Input
                    value={phoneCountryCode}
                    onChange={(v) =>
                      setPhoneCountryCode(v.replace(/[^0-9]/g, "").slice(0, 4))
                    }
                    placeholder="1"
                  />
                </Field>
                <Field label="Phone" required>
                  <Input
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    placeholder="670-355-3640"
                  />
                </Field>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDoc((v) => !v)}
              className="mt-1 self-start text-[11px] uppercase tracking-[0.16em] text-(--accent)"
            >
              {showDoc ? "− Hide travel document" : "+ Add travel document"}
            </button>

            {showDoc && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Document type">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className={inputCls}
                  >
                    <option value="passport">Passport</option>
                    <option value="id_card">ID card</option>
                  </select>
                </Field>
                <Field label="Document number">
                  <Input value={docNumber} onChange={setDocNumber} placeholder="123456789" />
                </Field>
                <Field label="Expiry">
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Issuing country (ISO)">
                  <Input
                    value={docCountry}
                    onChange={(v) => setDocCountry(v.toUpperCase().slice(0, 2))}
                    placeholder="US"
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Payment" sub="Sandbox — your card is not charged">
            <div className="rounded-sm border border-dashed border-(--rule-strong) bg-(--bg) p-4">
              <div className="flex flex-col gap-4">
                <Field label="Card number">
                  <input
                    disabled
                    value="4242 4242 4242 4242"
                    className={`${inputCls} opacity-60`}
                    readOnly
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry">
                    <input disabled value="12 / 30" className={`${inputCls} opacity-60`} readOnly />
                  </Field>
                  <Field label="CVC">
                    <input disabled value="123" className={`${inputCls} opacity-60`} readOnly />
                  </Field>
                </div>
              </div>
              <p className="mt-3 text-xs text-(--muted)">
                Booking runs on the LiteAPI sandbox credit line. No real payment
                is taken.
              </p>
            </div>
          </Section>

          {formError && (
            <p className="text-sm text-(--accent)">{formError}</p>
          )}

          {submitState === "done" && (
            <div className="rounded-sm border border-(--rule) bg-(--surface) p-4 text-sm">
              <p className="font-medium text-(--ink)">
                {failedCount === 0
                  ? `${bookedCount} booking${bookedCount === 1 ? "" : "s"} confirmed.`
                  : `${bookedCount} confirmed, ${failedCount} failed — see details on the right.`}
              </p>
              <p className="mt-1 text-(--muted)">
                Your confirmation details are shown in the order summary.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="btn-accent"
              disabled={!canSubmit}
              style={!canSubmit ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              {submitState === "submitting"
                ? "Processing…"
                : submitState === "done"
                  ? "Run again"
                  : "Confirm & pay →"}
            </button>
            <Link className="btn-ghost" href="/trip">
              ← Back to itinerary
            </Link>
          </div>
        </form>

        {/* ── order summary ────────────────────────────────── */}
        <aside className="h-fit rounded-sm border border-(--rule) bg-(--surface) p-5 lg:sticky lg:top-6">
          <h3 className="serif text-lg text-(--ink)">Order summary</h3>

          <div className="mt-4 flex flex-col gap-3">
            {flightLines.map((l) => {
              const res = results[l.key];
              const err = errors[l.key];
              return (
                <div key={l.key} className="border-b border-(--rule) pb-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-(--muted)">
                      {l.label}
                    </span>
                    <span className="serif text-sm text-(--ink)">
                      {money(l.flight.price, l.flight.currency)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-(--ink-2)">
                    {l.flight.carrierName} · {l.route}
                  </div>
                  <div className="text-xs text-(--muted)">
                    {l.flight.stops === 0
                      ? "Direct"
                      : `${l.flight.stops} stop${l.flight.stops > 1 ? "s" : ""}`}{" "}
                    · {fmtDuration(l.flight.durationMinutes)}
                  </div>
                  {res && (
                    <div className="mt-1 text-xs text-[#166534]">
                      ✓ Booked · Ref {res.bookingRef}
                      {res.simulated ? " · sandbox" : ""}
                    </div>
                  )}
                  {err && <div className="mt-1 text-xs text-(--accent)">{err}</div>}
                </div>
              );
            })}

            {hotelLines.map((l) => {
              const res = hotelResults[l.key];
              const err = errors[l.key];
              return (
                <div key={l.key} className="border-b border-(--rule) pb-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-(--muted)">
                      {l.label}
                    </span>
                    <span className="serif text-sm text-(--ink)">
                      {money(l.price, l.currency)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-(--ink-2)">{l.name}</div>
                  <div className="text-xs text-(--muted)">{l.dates}</div>
                  {res ? (
                    <div className="mt-1 text-xs text-[#166534]">
                      ✓ Booked · {res.status}
                      {res.hotelConfirmationCode
                        ? ` · ${res.hotelConfirmationCode}`
                        : ""}
                      <br />
                      Ref {res.bookingId}
                    </div>
                  ) : err ? (
                    <div className="mt-1 text-xs text-(--accent)">{err}</div>
                  ) : (
                    <div className="mt-1 text-xs text-(--muted)">
                      Prebooked · ready to confirm
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 text-sm">
            {flightLines.length > 0 && (
              <Row label="Flights" value={money(flightsTotal, flightCurrency)} />
            )}
            {hotelLines.length > 0 && (
              <Row
                label="Stays"
                value={money(hotelsTotal, hotelLines[0].currency)}
              />
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-(--rule-strong) pt-3">
              <span className="text-[11px] uppercase tracking-[0.16em] text-(--ink)">
                Total
              </span>
              <span className="serif text-xl text-(--ink)">
                {money(flightsTotal + hotelsTotal, flightCurrency)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-sm border border-(--rule-strong) bg-(--surface) px-3 py-2.5 text-sm text-(--ink) outline-none transition-colors focus:border-(--ink)";

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.16em] text-(--muted)">
        {label}
        {required && <span className="text-(--accent)"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="serif text-lg text-(--ink)">{title}</h3>
        {sub && <p className="text-xs text-(--muted)">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-(--ink-2)">
      <span className="text-(--muted)">{label}</span>
      <span>{value}</span>
    </div>
  );
}