import {create} from "zustand";
import {persist} from "zustand/middleware";
import type {Destination} from "./data";
import type {FlightOption, HotelOption, Intuition, NearestAirport, PrebookResult} from "./api";

// One hotel reservation per leg (prebooked on the itinerary screen).
export type Reservation = { hotel: HotelOption; data: PrebookResult };

type TripState = {
  prompt: string;
  intuitions: Intuition[];
  picks: Record<number, Destination>;
  departure: string;
  days: number[];
  departureAirport: NearestAirport | null;

  // The order being assembled — read by the /checkout screen. Keyed by leg id.
  reservations: Record<string, Reservation>;
  selectedFlights: Record<string, FlightOption>;
  returnFlight: FlightOption | null;

  setPrompt: (s: string) => void;
  setIntuitions: (i: Intuition[]) => void;
  setPick: (groupIdx: number, dest: Destination) => void;
  setDeparture: (s: string) => void;
  setDay: (i: number, v: number) => void;
  initDaysIfEmpty: (count: number) => void;
  setDepartureAirport: (a: NearestAirport | null) => void;
  reserveHotel: (legId: string, hotel: HotelOption, data: PrebookResult) => void;
  clearReservation: (legId: string) => void;
  setOrderFlights: (
    selectedFlights: Record<string, FlightOption>,
    returnFlight: FlightOption | null,
  ) => void;
  reset: () => void;
};

const DEFAULT_DEPARTURE = "2026-06-04";

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      prompt: "",
      intuitions: [],
      picks: {},
      departure: DEFAULT_DEPARTURE,
      days: [],
      departureAirport: null,
      reservations: {},
      selectedFlights: {},
      returnFlight: null,

      setPrompt: (s) => set({ prompt: s }),
      setIntuitions: (intuitions) =>
        set({
          intuitions,
          picks: {},
          days: [],
          reservations: {},
          selectedFlights: {},
          returnFlight: null,
        }),
      setPick: (groupIdx, dest) =>
        set((state) => ({ picks: { ...state.picks, [groupIdx]: dest } })),
      setDeparture: (s) => set({ departure: s }),
      setDay: (i, v) =>
        set((state) => {
          const nd = [...state.days];
          nd[i] = Math.max(1, Math.min(30, v));
          return { days: nd };
        }),
      initDaysIfEmpty: (count) =>
        set((state) =>
          state.days.length === count ? state : { days: Array(count).fill(3) },
        ),
      setDepartureAirport: (a) => set({ departureAirport: a }),
      reserveHotel: (legId, hotel, data) =>
        set((state) => ({
          reservations: { ...state.reservations, [legId]: { hotel, data } },
        })),
      clearReservation: (legId) =>
        set((state) => {
          const next = { ...state.reservations };
          delete next[legId];
          return { reservations: next };
        }),
      setOrderFlights: (selectedFlights, returnFlight) =>
        set({ selectedFlights, returnFlight }),
      reset: () =>
        set({
          prompt: "",
          intuitions: [],
          picks: {},
          departure: DEFAULT_DEPARTURE,
          days: [],
          departureAirport: null,
          reservations: {},
          selectedFlights: {},
          returnFlight: null,
        }),
    }),
    {
      name: "tripnintuite-trip",
      partialize: (s) => ({
        prompt: s.prompt,
        intuitions: s.intuitions,
        picks: s.picks,
        departure: s.departure,
        days: s.days,
        departureAirport: s.departureAirport,
        reservations: s.reservations,
        selectedFlights: s.selectedFlights,
        returnFlight: s.returnFlight,
      }),
    },
  ),
);

export function orderedPicks(
  intuitions: Intuition[],
  picks: Record<number, Destination>,
): Destination[] {
  return intuitions.map((_, i) => picks[i]).filter(Boolean);
}