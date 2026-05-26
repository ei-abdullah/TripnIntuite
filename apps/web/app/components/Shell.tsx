"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import { useAuthStore } from "../lib/authStore";
import { getMe, ApiError } from "../lib/api";

const SCREEN_LABELS: Record<string, string> = {
  "/": "01 Home",
  "/past": "02 Past Searches",
  "/select": "03 Location Selection",
  "/plan": "04 Plan Timeline",
  "/trip": "05 Itinerary",
  "/login": "06 Sign in",
  "/signup": "07 Sign up",
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (!hydrated || !token) return;
    // Validate the persisted token; refresh user info from the server.
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          clearAuth();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // We deliberately want this to run when the token first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token]);

  return (
    <div className="shell" data-screen-label={SCREEN_LABELS[pathname] ?? ""}>
      <Header />
      {children}
      <Footer />
    </div>
  );
}
