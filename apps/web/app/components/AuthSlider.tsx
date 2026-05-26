"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, signup, ApiError } from "../lib/api";
import { useAuthStore } from "../lib/authStore";

type Mode = "login" | "signup";

export default function AuthSlider({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [mode, setMode] = useState<Mode>(initialMode);

  const [liEmail, setLiEmail] = useState(params.get("email") ?? "");
  const [liPassword, setLiPassword] = useState("");
  const [siEmail, setSiEmail] = useState("");
  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    params.get("notice") === "verify"
      ? `We sent a verification link to ${params.get("email") ?? "your email"}. Open it, then sign in.`
      : null,
  );

  useEffect(() => {
    if (hydrated && token) router.replace("/");
  }, [hydrated, token, router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await login({ email: liEmail, password: liPassword });
      setAuth(res.accessToken, res.user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setSubmitting(false);
    }
  };

  const onSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email: siEmail, username: siUsername, password: siPassword });
      setLiEmail(siEmail);
      setNotice(`We sent a verification link to ${siEmail}. Open it, then sign in.`);
      setMode("login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = mode === "login";
  const inputCls =
    "border-b border-[var(--rule-strong)] bg-transparent py-2 outline-none focus:border-[var(--ink)] transition-colors placeholder:italic placeholder:text-[var(--muted-2)] text-[var(--ink)]";
  const submitCls =
    "mt-3 self-start inline-flex items-center gap-3 px-6 py-3 bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--accent)] text-xs uppercase tracking-[0.22em] font-medium hover:bg-transparent hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const overlayBtnCls =
    "inline-flex items-center gap-3 px-6 py-3 border border-[var(--accent-ink)] text-[var(--accent-ink)] text-xs uppercase tracking-[0.22em] font-medium hover:bg-[var(--accent-ink)] hover:text-[var(--ink)] transition-colors";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-3xl h-[520px] bg-[var(--surface)] border border-[var(--ink)] overflow-hidden">
        {/* Login form (left) */}
        <form
          onSubmit={onLogin}
          className="absolute inset-y-0 left-0 w-1/2 px-10 py-12 flex flex-col justify-center gap-5"
        >
          <div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Welcome back
            </span>
            <h2 className="serif text-3xl mt-2 text-[var(--ink)]">
              Sign <em className="italic">in</em>.
            </h2>
          </div>

          {notice && isLogin && (
            <p className="text-[13px] leading-snug text-[var(--ink-2)] border-l-2 border-[var(--ink)] pl-3 py-1">
              {notice}
            </p>
          )}

          <input
            type="email"
            placeholder="Email"
            value={liEmail}
            onChange={(e) => setLiEmail(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password"
            value={liPassword}
            onChange={(e) => setLiPassword(e.target.value)}
            required
            className={inputCls}
          />

          {isLogin && error && (
            <p className="text-[13px] text-[var(--accent)] border-l-2 border-[var(--accent)] pl-3 py-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting && isLogin}
            className={submitCls}
          >
            {submitting && isLogin ? "Signing in…" : "Sign in"}{" "}
            <span>→</span>
          </button>
        </form>

        {/* Signup form (right) */}
        <form
          onSubmit={onSignup}
          className="absolute inset-y-0 right-0 w-1/2 px-10 py-12 flex flex-col justify-center gap-5"
        >
          <div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Create an account
            </span>
            <h2 className="serif text-3xl mt-2 text-[var(--ink)]">
              Plan by <em className="italic">feeling</em>.
            </h2>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={siEmail}
            onChange={(e) => setSiEmail(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Username"
            value={siUsername}
            onChange={(e) => setSiUsername(e.target.value)}
            required
            minLength={2}
            maxLength={20}
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password (8+ chars)"
            value={siPassword}
            onChange={(e) => setSiPassword(e.target.value)}
            required
            minLength={8}
            className={inputCls}
          />

          {!isLogin && error && (
            <p className="text-[13px] text-[var(--accent)] border-l-2 border-[var(--accent)] pl-3 py-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting && !isLogin}
            className={submitCls}
          >
            {submitting && !isLogin ? "Creating…" : "Create account"}{" "}
            <span>→</span>
          </button>
        </form>

        {/* Sliding overlay */}
        <div
          className={`absolute inset-y-0 left-0 w-1/2 bg-[var(--ink)] text-[var(--accent-ink)] flex items-center justify-center px-10 py-12 text-center transition-transform duration-700 ease-[cubic-bezier(0.72,0.05,0.18,1)] ${
            isLogin ? "translate-x-full" : "translate-x-0"
          }`}
        >
          {isLogin ? (
            <div className="flex flex-col items-center gap-4 max-w-[280px]">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                First time here?
              </span>
              <h3 className="serif text-2xl">
                Create an <em className="italic text-[var(--accent)]">account</em>.
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-2)]">
                Your trips, drafts, and bookings stay with you across devices.
              </p>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={overlayBtnCls}
              >
                Sign up <span>→</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 max-w-[280px]">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                Already with us?
              </span>
              <h3 className="serif text-2xl">
                Sign back <em className="italic text-[var(--accent)]">in</em>.
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-2)]">
                Pick up where you left off — every draft and booking, exactly as you left them.
              </p>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={overlayBtnCls}
              >
                Sign in <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
