import {create} from "zustand";
import {persist} from "zustand/middleware";
import type {Destination} from "./data";
import type {Intuition, NearestAirport} from "./api";

type TripState = {
  prompt: string;
  intuitions: Intuition[];
  picks: Record<number, Destination>;
  departure: string;
  days: number[];
  departureAirport: NearestAirport | null;

  setPrompt: (s: string) => void;
  setIntuitions: (i: Intuition[]) => void;
  setPick: (groupIdx: number, dest: Destination) => void;
  setDeparture: (s: string) => void;
  setDay: (i: number, v: number) => void;
  initDaysIfEmpty: (count: number) => void;
  setDepartureAirport: (a: NearestAirport | null) => void;
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

      setPrompt: (s) => set({ prompt: s }),
      setIntuitions: (intuitions) => set({ intuitions, picks: {}, days: [] }),
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
      reset: () =>
        set({
          prompt: "",
          intuitions: [],
          picks: {},
          departure: DEFAULT_DEPARTURE,
          days: [],
          departureAirport: null,
        }),
    }),
    {
      name: "majestor-trip",
      partialize: (s) => ({
        prompt: s.prompt,
        intuitions: s.intuitions,
        picks: s.picks,
        departure: s.departure,
        days: s.days,
        departureAirport: s.departureAirport,
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