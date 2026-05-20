"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parsePrompt, type Intuition } from "./lib/api";
import { useTripStore } from "./lib/tripStore";
import AgentConsole from "./components/AgentConsole";

const DEMO_PROMPT =
  "I want to go somewhere with desert and mountains and some human populations, then I want to see northern lights on snowy mountains.";

export default function HomePage() {
  const router = useRouter();
  const storedPrompt = useTripStore((s) => s.prompt);
  const setStoredPrompt = useTripStore((s) => s.setPrompt);
  const setIntuitions = useTripStore((s) => s.setIntuitions);

  const [text, setText] = useState(storedPrompt || "");
  const [running, setRunning] = useState(false);
  const [localIntuitions, setLocalIntuitions] = useState<Intuition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (taRef.current) taRef.current.focus();
  }, []);

  const explore = async () => {
    const value = text.trim() || DEMO_PROMPT;
    setStoredPrompt(value);
    setText(value);
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
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(
        `Backend call failed: ${msg}. Is the Spring Boot API running on port 8080? (frontend proxies /api/* via next.config.ts rewrites)`,
      );
      setRunning(false);
    }
  };

  const onConsoleDone = () => {
    router.push("/select");
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
                <span className="label">TripIntuition · Coordinator</span>
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
            <AgentConsole
              intuitions={localIntuitions}
              onDone={onConsoleDone}
            />
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
