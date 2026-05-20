"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

const SCREEN_LABELS: Record<string, string> = {
  "/": "01 Home",
  "/past": "02 Past Searches",
  "/select": "03 Location Selection",
  "/plan": "04 Plan Timeline",
  "/trip": "05 Itinerary",
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="shell" data-screen-label={SCREEN_LABELS[pathname] ?? ""}>
      <Header />
      {children}
      <Footer />
    </div>
  );
}