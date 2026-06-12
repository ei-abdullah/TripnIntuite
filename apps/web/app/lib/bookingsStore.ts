import { create } from "zustand";
import { persist } from "zustand/middleware";

// Completed bookings — the post-checkout payoff. Persisted to localStorage so
// they survive reloads (and outlive the backend's create-drop DB). Separate
// from the trip-planning store so starting a new trip never wipes history.

export type BookedFlight = {
  key: string;
  label: string;
  route: string;
  carrierName: string;
  price: number;
  currency: string;
  bookingRef: string;
  simulated: boolean;
  // ISO datetimes — drive the .ics events and add-to-calendar links.
  departISO?: string;
  arriveISO?: string;
};

export type BookedHotel = {
  key: string;
  label: string;
  name: string;
  dates: string;
  price: number;
  currency: string;
  bookingId: string;
  status: string;
  hotelConfirmationCode: string | null;
  // ISO dates (YYYY-MM-DD) — all-day calendar events for the stay.
  checkinISO?: string;
  checkoutISO?: string;
};

export type TripBooking = {
  id: string;
  createdAt: string; // ISO
  title: string;
  homeIata: string;
  flights: BookedFlight[];
  hotels: BookedHotel[];
  flightsTotal: number;
  hotelsTotal: number;
  currency: string;
  // Recipient used for the confirmation email + on-demand resend.
  contactEmail?: string;
};

type BookingsState = {
  bookings: TripBooking[];
  addBooking: (b: TripBooking) => void;
  removeBooking: (id: string) => void;
  clearBookings: () => void;
};

export const useBookingsStore = create<BookingsState>()(
  persist(
    (set) => ({
      bookings: [],
      addBooking: (b) => set((s) => ({ bookings: [b, ...s.bookings] })),
      removeBooking: (id) =>
        set((s) => ({ bookings: s.bookings.filter((x) => x.id !== id) })),
      clearBookings: () => set({ bookings: [] }),
    }),
    { name: "majestor-bookings" },
  ),
);