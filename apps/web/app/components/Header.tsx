"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";
import {useAuthStore} from "../lib/authStore";
import {logout} from "../lib/api";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when the route changes. Adjusting state during render (vs. in
  // an effect) avoids the cascading re-render that set-state-in-effect causes.
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }

  const isPast = pathname === "/past";
  const isAuthed = !!token;

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/");
  };

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <em>TripnIntuite</em>
          </span>
        </Link>

        <nav className="nav">
          <Link className={`nav-link ${isPast ? "active" : ""}`} href="/trips">
            Trips
          </Link>

          {hydrated &&
            (isAuthed ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`nav-link nav-link-btn inline-flex items-center gap-2 max-w-[200px] ${
                    menuOpen ? "active" : ""
                  }`}
                >
                  <span className="truncate">
                    {user?.username ?? user?.email}
                  </span>
                  <span
                    className={`text-[9px] transition-transform ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+10px)] min-w-[260px] bg-[var(--surface)] border border-[var(--ink)] z-50"
                  >
                    <div className="px-5 py-4 border-b border-[var(--rule)]">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-2)] mb-1">
                        Signed in as
                      </div>
                      <div className="text-[13px] text-[var(--ink)] break-all">
                        {user?.email}
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      <button
                        type="button"
                        onClick={handleLogout}
                        role="menuitem"
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.22em",
                          fontWeight: 500,
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "background 0.2s ease, color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-ink)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                        }}
                      >
                        Sign out
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link className="nav-link" href="/login">
                Sign in
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
