"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {ApiError, getNearestAirport, type Intuition, parsePrompt} from "./lib/api";
import {useTripStore} from "./lib/tripStore";
import {useAuthStore} from "./lib/authStore";
import AgentConsole from "./components/AgentConsole";

const DEMO_PROMPT =
  "I want to go somewhere with desert and mountains and some human populations, then I want to see northern lights on snowy mountains.";

export default function HomePage() {
  const router = useRouter();
  const storedPrompt = useTripStore((s) => s.prompt);
  const setStoredPrompt = useTripStore((s) => s.setPrompt);
  const setIntuitions = useTripStore((s) => s.setIntuitions);
  const departureAirport = useTripStore((s) => s.departureAirport);
  const setDepartureAirport = useTripStore((s) => s.setDepartureAirport);
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);

  const [text, setText] = useState(storedPrompt || "");
  const [running, setRunning] = useState(false);
  const [localIntuitions, setLocalIntuitions] = useState<Intuition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locState, setLocState] = useState<"idle" | "detecting" | "error">("idle");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocState("detecting");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const airport = await getNearestAirport(coords.latitude, coords.longitude);
          setDepartureAirport(airport);
          setLocState("idle");
        } catch {
          setLocState("error");
        }
      },
      () => setLocState("error"),
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    if (taRef.current) taRef.current.focus();
  }, []);

  // Auto-detect the home airport once on mount. Deferred to a macrotask so the
  // "detecting" state set inside detectLocation() isn't applied synchronously
  // within the effect (which would trigger a cascading render). The timer is
  // canceled on cleanup (StrictMode double-invoke / unmount).
  useEffect(() => {
    if (departureAirport || locState !== "idle") return;
    const id = setTimeout(detectLocation, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const explore = async () => {
    const value = text.trim() || DEMO_PROMPT;
    setStoredPrompt(value);
    setText(value);

    // Auth gate: prompt is preserved in tripStore; return here after login.
    if (hydrated && !token) {
      router.push("/signup");
      return;
    }

    setError(null);
    setLocalIntuitions([]);
    setRunning(true);
    try {
      const result = await parsePrompt(value);
      if (result.length === 0) {
        setError("No intuitions could be parsed. Try a more descriptive prompt.");
        setRunning(false);
        return;
      }
      setIntuitions(result);
      setLocalIntuitions(result);
    } catch (e) {
      let msg: string;
      if (e instanceof ApiError) {
        if (e.status === 401) {
          router.push("/login");
          return;
        }
        msg = e.message;
      } else {
        msg = e instanceof Error ? e.message : "Unknown error";
      }
      setError(msg);
      setRunning(false);
    }
  };

  return (
    <main className="hero fade-in">
      <div className="container">
        <div className="hero-inner">
          <div className="eyebrow">Travel by feeling, not by name</div>
          <h1 className="serif">
            Describe the trip
            <br />
            you can <em>almost</em> see.
          </h1>

          <div className="intuition-box">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={DEMO_PROMPT}
              disabled={running}
            />
            <div className="intuition-box-foot">
              <span className="intuition-meta">
                {text.length || 0} characters · natural language
              </span>
              <button
                className="explore-btn"
                onClick={explore}
                disabled={running}
              >
                {running ? "Exploring…" : "Explore"}{" "}
                <span className="arrow">→</span>
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "var(--muted)",
            }}
          >
            Departing from
            <span style={{ color: "var(--rule-strong)" }}>·</span>
            {departureAirport ? (
              <>
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {departureAirport.iataCode}
                </span>
                <span style={{ color: "var(--rule-strong)" }}>·</span>
                <span style={{ color: "var(--ink)" }}>{departureAirport.name}</span>
                <button
                  onClick={() => { setDepartureAirport(null); setLocState("idle"); }}
                  style={{ color: "var(--muted-2)", fontSize: "10px", cursor: "pointer" }}
                >
                  ✕
                </button>
              </>
            ) : locState === "detecting" ? (
              <span>Detecting…</span>
            ) : locState === "error" ? (
              <span style={{ color: "var(--accent)" }}>Could not detect · <button onClick={detectLocation} style={{ cursor: "pointer", color: "var(--accent)" }}>Retry</button></span>
            ) : (
              <button
                onClick={detectLocation}
                style={{ color: "var(--accent)", cursor: "pointer", borderBottom: "1px solid var(--accent)" }}
              >
                Detect location
              </button>
            )}
          </div>

          {!running && (
            <div className="prompt-chips">
              {[
                "A walled medina at the foot of the Atlas, then alpine snow",
                "Old temples on a hill, then a fishing village by the sea",
                "Desert and mountains with people, then northern lights",
              ].map((p) => (
                <span
                  key={p}
                  className="chip"
                  onClick={() => {
                    setText(p);
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {running && localIntuitions.length === 0 && !error && (
            <div className="console">
              <div className="console-head">
                <span className="label">TripnIntuite · Coordinator</span>
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="console-line agent-coord">
                <span className="ts">[..... ]</span>
                <span className="agent">Coordinator</span>
                <span className="msg">
                  Calling Anthropic… parsing intuitions and dispatching research agents.
                </span>
              </div>
            </div>
          )}

          {running && localIntuitions.length > 0 && (
            <AgentConsole intuitions={localIntuitions} doneHref="/select" />
          )}

          {error && (
            <div className="console" style={{ borderColor: "#c0392b" }}>
              <div className="console-head">
                <span className="label" style={{ color: "#c0392b" }}>
                  Error
                </span>
              </div>
              <div className="console-line" style={{ color: "#c0392b" }}>
                <span className="msg">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
