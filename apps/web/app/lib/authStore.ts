import {create} from "zustand";
import {persist} from "zustand/middleware";
import type {UserDto} from "./api";

type AuthState = {
  token: string | null;
  user: UserDto | null;
  hydrated: boolean;
  setAuth: (token: string, user: UserDto) => void;
  setUser: (user: UserDto) => void;
  clearAuth: () => void;
  setHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "tripnintuite-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
