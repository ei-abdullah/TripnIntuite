"use client";

import {useEffect, useState} from "react";
import type {Intuition} from "../lib/api";

type ConsoleLine = {
  ts: string;
  agent: string;
  cls?: string;
  msg: string;
  done?: boolean;
};

export default function AgentConsole({
  intuitions,
  onDone,
}: {
  intuitions: Intuition[];
  onDone: () => void;
}) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t0 = Date.now();
    const t = () => {
      const ms = Date.now() - t0;
      const s = (ms / 1000).toFixed(2);
      return s.padStart(5, "0");
    };
    const push = (delay: number, line: Omit<ConsoleLine, "ts">) => {
      timers.push(
        setTimeout(() => {
          setLines((l) => [...l, { ...line, ts: t() }]);
        }, delay),
      );
    };

    push(50, {
      agent: "Coordinator",
      cls: "agent-coord",
      msg: `Parsing prompt — ${intuitions.length} destination intuitions found.`,
    });
    push(450, {
      agent: "Coordinator",
      cls: "agent-coord",
      msg: `Spinning up ${intuitions.length} research agents in parallel...`,
    });

    let cursor = 850;
    intuitions.forEach((it, i) => {
      const cls = `agent-${(i % 3) + 1}`;
      const agent = `Agent ${i + 1}`;
      push(cursor, {
        agent,
        cls,
        msg: `Searching for: "${it.segment.slice(0, 80)}"`,
      });
      push(cursor + 600, { agent, cls, msg: `Theme classified: ${it.theme}` });
      push(cursor + 1200, {
        agent,
        cls,
        msg: `Querying place-graph (geography, climate, season)...`,
      });
      push(cursor + 1900, {
        agent,
        cls,
        msg: `Scoring ${it.cards.length * 4} candidates against intuition vector.`,
      });
      push(cursor + 2600, {
        agent,
        cls,
        msg: `Returned ${it.cards.length} matches`,
        done: true,
      });
      cursor += 600;
    });

    const finishAt = 850 + intuitions.length * 600 + 2900;
    push(finishAt, {
      agent: "Coordinator",
      cls: "agent-coord",
      msg: `All agents reported. Composing selection grid.`,
      done: true,
    });
    timers.push(
      setTimeout(() => {
        setRunning(false);
        onDone();
      }, finishAt + 700),
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="console">
      <div className="console-head">
        <span className="label">TripIntuition · Coordinator</span>
        <div className="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          className={`console-line ${l.cls || ""} ${l.done ? "done" : ""}`}
        >
          <span className="ts">[{l.ts}s]</span>
          <span className="agent">{l.agent}</span>
          <span className="msg">{l.msg}</span>
        </div>
      ))}
      {running && (
        <div className="console-line">
          <span className="ts">[..... ]</span>
          <span className="agent"></span>
          <span className="msg console-cursor"></span>
        </div>
      )}
    </div>
  );
}