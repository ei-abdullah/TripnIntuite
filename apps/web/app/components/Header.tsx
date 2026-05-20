"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isPast = pathname === "/past";

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <em>Majestor</em>
          </span>
          <span className="brand-sub">Travel by feeling</span>
        </Link>
        <nav className="nav">
          <Link className={`nav-link ${isHome ? "active" : ""}`} href="/">
            Plan
          </Link>
          <Link className={`nav-link ${isPast ? "active" : ""}`} href="/past">
            Past Searches
          </Link>
        </nav>
      </div>
    </header>
  );
}