"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { HotelOption, PrebookResult } from "../lib/api";

export type BookingEntry = {
  legId: string;
  legName: string;
  checkin: string;
  checkout: string;
  hotel: HotelOption;
  data: PrebookResult;
};

export default function BookingsDrawer({
  open,
  bookings,
  onRemove,
  onClose,
}: {
  open: boolean;
  bookings: BookingEntry[];
  onRemove: (legId: string) => void;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your bookings"
        className={`absolute right-0 top-0 h-full w-[min(460px,100vw)] overflow-y-auto border-l border-(--rule) bg-(--bg) shadow-[-8px_0_40px_rgba(17,17,17,0.08)] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-baseline justify-between border-b border-(--rule) px-7 py-6">
          <h3 className="serif text-[22px] text-(--ink)">Your bookings</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-[34px] w-[34px] place-items-center rounded-full bg-(--surface) text-[13px] text-(--ink) shadow-[0_2px_10px_rgba(17,17,17,0.10)] transition-colors hover:bg-(--bg)"
          >
            ✕
          </button>
        </div>

        <div className="px-7 pb-14 pt-6">
          {bookings.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-(--muted)">
              No hotels reserved yet. Reserve a room from any leg and it’ll show
              up here.
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => {
                const warnings: string[] = [];
                if (b.data.priceDifferencePercent !== 0)
                  warnings.push(
                    `Price changed ${b.data.priceDifferencePercent > 0 ? "+" : ""}${b.data.priceDifferencePercent}%`,
                  );
                if (b.data.cancellationChanged)
                  warnings.push("Cancellation policy changed");
                if (b.data.boardChanged) warnings.push("Meal plan changed");
                return (
                  <div
                    key={b.legId}
                    className="rounded-sm border border-(--rule) bg-(--surface) p-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.16em] text-(--muted-2)">
                      {b.legName}
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="serif text-[17px] leading-tight text-(--ink)">
                          {b.hotel.name}
                        </div>
                        <div className="mt-1 text-[12px] text-(--muted)">
                          {fmtNight(b.checkin)} → {fmtNight(b.checkout)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="serif text-[18px] text-(--ink)">
                          {money(b.data.price, b.data.currency)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-green-800">
                          ✓ Locked
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-(--muted)">
                      Prebook{" "}
                      <span className="font-mono text-(--ink-2)">
                        {b.data.prebookId}
                      </span>
                    </div>

                    {warnings.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[12px] text-(--accent)">
                        {warnings.map((w, i) => (
                          <li key={i}>⚠ {w}</li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex justify-end border-t border-(--rule) pt-3">
                      <button
                        type="button"
                        onClick={() => onRemove(b.legId)}
                        className="text-[11px] uppercase tracking-[0.14em] text-(--accent) underline underline-offset-2 transition-colors hover:text-(--ink)"
                      >
                        Edit / remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
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