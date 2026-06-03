"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  type HotelDetails,
  type HotelOption,
  type HotelRates,
  type PrebookResult,
  getHotelDetails,
  getHotelRates,
  prebookHotel,
} from "../lib/api";
import MediaGallery, { type MediaItem } from "./MediaGallery";

type RatesState =
  | { status: "loading" }
  | { status: "ready"; forId: string; data: HotelRates }
  | { status: "error"; forId: string };

type DetailsState =
  | { status: "loading" }
  | { status: "ready"; forId: string; data: HotelDetails }
  | { status: "error"; forId: string };

// Transient state of the prebook network call. The successful result is owned
// by the leg (one reservation per leg), so there's no "ready" here.
type PrebookState =
  | { status: "idle" }
  | { status: "loading"; offerId: string }
  | { status: "error"; offerId: string; message: string };

type Reservation = { hotel: HotelOption; data: PrebookResult };

export default function HotelDrawer({
  hotel,
  checkin,
  checkout,
  reservation,
  onReserved,
  onClearReservation,
  onClose,
}: {
  hotel: HotelOption | null;
  checkin: string;
  checkout: string;
  reservation: Reservation | null;
  onReserved: (data: PrebookResult) => void;
  onClearReservation: () => void;
  onClose: () => void;
}) {
  const [rates, setRates] = useState<RatesState>({ status: "loading" });
  const [details, setDetails] = useState<DetailsState>({ status: "loading" });
  const [prebook, setPrebook] = useState<PrebookState>({ status: "idle" });
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);

  // document.body only exists in the browser; false on server, true on client.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const hotelId = hotel?.id ?? null;

  useEffect(() => {
    if (!hotelId) return;
    let alive = true;
    getHotelRates(hotelId, checkin, checkout)
      .then((data) => alive && setRates({ status: "ready", forId: hotelId, data }))
      .catch(() => alive && setRates({ status: "error", forId: hotelId }));
    return () => {
      alive = false;
    };
  }, [hotelId, checkin, checkout]);

  // Content (gallery, video, facilities, policies) — fetched in parallel with
  // rates, independent of the date window.
  useEffect(() => {
    if (!hotelId) return;
    let alive = true;
    getHotelDetails(hotelId)
      .then((data) => alive && setDetails({ status: "ready", forId: hotelId, data }))
      .catch(() => alive && setDetails({ status: "error", forId: hotelId }));
    return () => {
      alive = false;
    };
  }, [hotelId]);

  const onReserve = (offerId: string) => {
    setPrebook({ status: "loading", offerId });
    prebookHotel(offerId)
      .then((data) => {
        setPrebook({ status: "idle" });
        onReserved(data); // hand the locked rate up to the leg
      })
      .catch((e: unknown) =>
        setPrebook({
          status: "error",
          offerId,
          message:
            e instanceof Error ? e.message : "Couldn’t reserve this rate.",
        }),
      );
  };

  useEffect(() => {
    if (!hotel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotel, onClose]);

  if (!mounted) return null;

  const open = hotel !== null;
  // A settled result for a previous hotel reads as loading.
  const view: RatesState =
    rates.status === "loading" || rates.forId === hotelId
      ? rates
      : { status: "loading" };
  const stars = hotel ? Math.max(0, Math.min(5, Math.round(hotel.stars))) : 0;
  const chain =
    hotel?.chain && hotel.chain !== "Not Available" ? hotel.chain : null;

  // Leg-level booking gate: one hotel reserved per leg.
  const reservedForThisHotel =
    reservation !== null && hotel !== null && reservation.hotel.id === hotel.id;
  const lockedByOther =
    reservation !== null && hotel !== null && reservation.hotel.id !== hotel.id;

  // Details for the CURRENT hotel only (a stale result reads as none).
  const dv =
    details.status === "ready" && details.forId === hotelId
      ? details.data
      : null;

  // Media gallery: video first (if any), then images. Falls back to the
  // listing thumbnail while details load or if none are returned.
  const media: MediaItem[] = [];
  if (dv?.videoUrl) media.push({ type: "video", url: dv.videoUrl });
  if (dv) {
    for (const img of dv.images) {
      media.push({ type: "image", url: img.url, caption: img.caption });
    }
  }
  const description = dv?.description || hotel?.description || "";
  const facts =
    dv &&
    (dv.checkinTime || dv.checkoutTime || dv.parking || dv.petsAllowed || dv.childAllowed);

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={hotel?.name ?? "Hotel details"}
        className={`absolute right-0 top-0 h-full w-[min(460px,100vw)] overflow-y-auto border-l border-(--rule) bg-(--bg) shadow-[-8px_0_40px_rgba(17,17,17,0.08)] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {hotel && (
          <>
            {/* hero — media gallery (video + images) */}
            <div className="relative">
              <MediaGallery media={media} fallback={hotel.mainPhoto} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 grid h-[34px] w-[34px] place-items-center rounded-full bg-(--surface) text-[13px] text-(--ink) shadow-[0_2px_10px_rgba(17,17,17,0.12)] transition-colors hover:bg-(--bg)"
              >
                ✕
              </button>
            </div>

            <div className="px-7 pb-14 pt-7">
              {/* header */}
              {chain && (
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-(--muted-2)">
                  {chain}
                </div>
              )}
              <h3 className="serif text-[26px] leading-tight text-(--ink)">
                {hotel.name}
              </h3>
              <div className="mt-2.5 flex flex-wrap items-baseline gap-2 text-[13px] text-(--muted)">
                {stars > 0 && (
                  <span className="tracking-wider text-(--accent)">
                    {"★".repeat(stars)}
                  </span>
                )}
                <span>
                  {[hotel.address, hotel.city, hotel.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
              <div className="mt-3 text-[14px]">
                <strong className="text-[18px]">{hotel.rating.toFixed(1)}</strong>
                <span className="text-(--muted)"> / 10</span>
                <span className="ml-3 text-[12px] text-(--muted)">
                  {hotel.reviewCount.toLocaleString()} reviews
                </span>
              </div>

              {facts && (
                <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                  {dv?.checkinTime && (
                    <span className="rounded-sm border border-(--rule) bg-(--surface) px-2.5 py-1 text-(--ink-2)">
                      Check-in {dv.checkinTime}
                    </span>
                  )}
                  {dv?.checkoutTime && (
                    <span className="rounded-sm border border-(--rule) bg-(--surface) px-2.5 py-1 text-(--ink-2)">
                      Check-out {dv.checkoutTime}
                    </span>
                  )}
                  {dv?.parking && (
                    <span className="rounded-sm border border-(--rule) bg-(--surface) px-2.5 py-1 text-(--ink-2)">
                      Parking
                    </span>
                  )}
                  {dv?.petsAllowed && (
                    <span className="rounded-sm border border-(--rule) bg-(--surface) px-2.5 py-1 text-(--ink-2)">
                      Pet friendly
                    </span>
                  )}
                  {dv?.childAllowed && (
                    <span className="rounded-sm border border-(--rule) bg-(--surface) px-2.5 py-1 text-(--ink-2)">
                      Family friendly
                    </span>
                  )}
                </div>
              )}

              {description && (
                <div
                  className="mt-5 text-[13.5px] leading-relaxed text-(--ink-2) [&_p]:mt-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-(--ink)"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                />
              )}

              {dv && dv.facilities.length > 0 && (
                <div className="mt-7">
                  <strong className="text-[12px] uppercase tracking-[0.18em]">
                    Amenities
                  </strong>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(showAllAmenities
                      ? dv.facilities
                      : dv.facilities.slice(0, 10)
                    ).map((f, fi) => (
                      <span
                        key={fi}
                        className="rounded-sm border border-(--rule) bg-(--surface) px-2.5 py-1 text-[12px] text-(--ink-2)"
                      >
                        {f}
                      </span>
                    ))}
                    {dv.facilities.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setShowAllAmenities((s) => !s)}
                        className="rounded-sm px-2.5 py-1 text-[12px] text-(--accent) underline underline-offset-2"
                      >
                        {showAllAmenities
                          ? "Show less"
                          : `+${dv.facilities.length - 10} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {dv && (dv.importantInfo || dv.policies.length > 0) && (
                <div className="mt-7 border-t border-(--rule) pt-5">
                  <button
                    type="button"
                    onClick={() => setPoliciesOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <strong className="text-[12px] uppercase tracking-[0.18em]">
                      Good to know
                    </strong>
                    <span className="text-[16px] leading-none text-(--muted)">
                      {policiesOpen ? "−" : "+"}
                    </span>
                  </button>
                  {policiesOpen && (
                    <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-(--ink-2) [&_p]:mt-2 [&_strong]:font-semibold [&_strong]:text-(--ink) [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-4">
                      {dv.importantInfo && (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(dv.importantInfo),
                          }}
                        />
                      )}
                      {dv.policies.map((p, pi) => (
                        <div key={pi}>
                          {p.title && (
                            <div className="font-semibold text-(--ink)">
                              {p.title}
                            </div>
                          )}
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(p.description),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* rooms */}
              <div className="mt-8 border-t border-(--rule) pt-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <strong className="text-[12px] uppercase tracking-[0.18em]">
                    Rooms
                  </strong>
                  <span className="text-[12px] text-(--muted)">
                    {fmtNight(checkin)} → {fmtNight(checkout)}
                  </span>
                </div>

                {lockedByOther && (
                  <div className="mb-4 rounded-sm border border-(--rule-strong) bg-(--surface) px-3.5 py-3 text-[12.5px] text-(--ink-2)">
                    Another hotel is already reserved for this leg. Edit your
                    booking to choose this one instead.
                    <button
                      type="button"
                      onClick={onClearReservation}
                      className="ml-1.5 font-semibold text-(--accent) underline underline-offset-2"
                    >
                      Edit booking
                    </button>
                  </div>
                )}

                {view.status === "loading" && <RoomsSkeleton />}

                {view.status === "error" && (
                  <div className="py-6 text-[13px] text-(--muted)">
                    Couldn’t load pricing. Try again shortly.
                  </div>
                )}

                {view.status === "ready" && view.data.rooms.length === 0 && (
                  <div className="py-6 text-[13px] text-(--muted)">
                    No availability for these dates.
                  </div>
                )}

                {view.status === "ready" &&
                  view.data.rooms.map((room, i) => {
                    const perNight =
                      view.data.nights > 0
                        ? room.totalAmount / view.data.nights
                        : room.totalAmount;
                    const isActive =
                      prebook.status !== "idle" &&
                      prebook.offerId === room.offerId;
                    const reserving =
                      prebook.status === "loading" && isActive;
                    // This exact room holds the leg's reservation.
                    const bookedRoom =
                      reservedForThisHotel &&
                      reservation!.data.offerId === room.offerId;
                    // Reserve is only offered when this leg has no reservation yet.
                    const canReserve = reservation === null;
                    return (
                      <div
                        key={room.offerId || i}
                        className="border-b border-(--rule) py-4"
                      >
                        <div className="flex justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-(--ink)">
                              {room.name}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[12px] text-(--muted)">
                              <span>{room.boardName || "Room only"}</span>
                              <span
                                className={`rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                                  room.refundable
                                    ? "bg-green-700/10 text-green-800"
                                    : "bg-(--rule) text-(--muted-2)"
                                }`}
                              >
                                {room.refundable
                                  ? "Free cancellation"
                                  : "Non-refundable"}
                              </span>
                            </div>
                            {room.perks.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {room.perks.slice(0, 3).map((p, pi) => (
                                  <span
                                    key={pi}
                                    className="rounded-sm bg-(--accent)/10 px-2 py-0.5 text-[11px] text-(--accent)"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end">
                            <div className="serif text-[19px] text-(--ink)">
                              {money(room.totalAmount, room.currency)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-(--muted)">
                              {money(perNight, room.currency)} / night ·{" "}
                              {view.data.nights} nt
                            </div>
                            {canReserve && (
                              <button
                                type="button"
                                disabled={reserving}
                                onClick={() => onReserve(room.offerId)}
                                className="mt-2.5 rounded-sm bg-(--ink) px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-(--bg) transition-opacity hover:opacity-85 disabled:opacity-50"
                              >
                                {reserving ? "Reserving…" : "Reserve →"}
                              </button>
                            )}
                          </div>
                        </div>

                        {bookedRoom && (
                          <PrebookConfirm
                            data={reservation!.data}
                            onEdit={onClearReservation}
                          />
                        )}
                        {prebook.status === "error" && isActive && (
                          <div className="mt-3 rounded-sm border border-(--accent)/30 bg-(--accent)/5 px-3.5 py-3 text-[12.5px] text-(--accent)">
                            {prebook.message}{" "}
                            <button
                              type="button"
                              onClick={() => onReserve(room.offerId)}
                              className="font-semibold underline underline-offset-2"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}

// Prebook confirmation strip: the rate is locked and a prebookId is held. We
// flag the three fields LiteAPI says to check (price drift, cancellation/board
// changes) so the guest sees any shift before the (upcoming) book step.
function PrebookConfirm({
  data,
  onEdit,
}: {
  data: PrebookResult;
  onEdit: () => void;
}) {
  const warnings: string[] = [];
  if (data.priceDifferencePercent !== 0) {
    warnings.push(
      `Price changed ${data.priceDifferencePercent > 0 ? "+" : ""}${data.priceDifferencePercent}% since you viewed it.`,
    );
  }
  if (data.cancellationChanged)
    warnings.push("Cancellation policy changed.");
  if (data.boardChanged) warnings.push("Meal plan changed.");

  return (
    <div className="mt-3 rounded-sm border border-green-700/25 bg-green-700/5 px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.16em] text-green-800">
          ✓ Rate locked
        </span>
        <span className="serif text-[18px] text-(--ink)">
          {money(data.price, data.currency)}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-(--muted)">
        Held under prebook{" "}
        <span className="font-mono text-(--ink-2)">{data.prebookId}</span>
      </div>
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-(--accent)">
          {warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled
          className="flex-1 cursor-not-allowed rounded-sm bg-(--ink)/40 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] text-(--bg)"
          title="Booking step coming next"
        >
          Continue to guest details →
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-(--muted) underline underline-offset-2 transition-colors hover:text-(--ink)"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex animate-pulse justify-between gap-4 border-b border-(--rule) py-4"
        >
          <div className="min-w-0 space-y-2">
            <div className="h-3.5 w-40 rounded bg-(--rule)" />
            <div className="h-3 w-24 rounded bg-(--rule)" />
          </div>
          <div className="h-5 w-16 shrink-0 rounded bg-(--rule)" />
        </div>
      ))}
    </>
  );
}

// Hotel descriptions come back as HTML. Keep a small allowlist of formatting
// tags and drop everything else (incl. all attributes) so there's no injection
// surface from this third-party content.
function sanitizeHtml(html: string): string {
  const allowed = /^(p|br|strong|b|em|i|ul|ol|li)$/i;
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\/?\s*([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tag) =>
      allowed.test(tag) ? match.replace(/\s[^>]*(?=>)/, "") : "",
    );
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

function fmtNight(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}