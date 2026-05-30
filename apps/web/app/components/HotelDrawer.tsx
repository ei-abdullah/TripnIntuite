"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  type HotelOption,
  type HotelRates,
  getHotelRates,
} from "../lib/api";

type RatesState =
  | { status: "loading" }
  | { status: "ready"; forId: string; data: HotelRates }
  | { status: "error"; forId: string };

export default function HotelDrawer({
  hotel,
  checkin,
  checkout,
  onClose,
}: {
  hotel: HotelOption | null;
  checkin: string;
  checkout: string;
  onClose: () => void;
}) {
  const [rates, setRates] = useState<RatesState>({ status: "loading" });

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
            {/* hero */}
            <div
              className="relative h-[220px] w-full bg-(--rule) bg-cover bg-center"
              style={
                hotel.mainPhoto
                  ? { backgroundImage: `url(${hotel.mainPhoto})` }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 grid h-[34px] w-[34px] place-items-center rounded-full bg-(--surface) text-[13px] text-(--ink) shadow-[0_2px_10px_rgba(17,17,17,0.12)] transition-colors hover:bg-(--bg)"
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

              {hotel.description && (
                <div
                  className="mt-5 text-[13.5px] leading-relaxed text-(--ink-2) [&_p]:mt-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-(--ink)"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(hotel.description),
                  }}
                />
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
                    return (
                      <div
                        key={room.offerId || i}
                        className="flex justify-between gap-4 border-b border-(--rule) py-4"
                      >
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
                        <div className="shrink-0 text-right">
                          <div className="serif text-[19px] text-(--ink)">
                            {money(room.totalAmount, room.currency)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-(--muted)">
                            {money(perNight, room.currency)} / night ·{" "}
                            {view.data.nights} nt
                          </div>
                        </div>
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