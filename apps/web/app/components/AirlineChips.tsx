"use client";

import { useState } from "react";
import type { AirlineOption } from "../lib/data";
import { fmtUSD } from "../lib/dates";

export default function AirlineChips({ options }: { options: AirlineOption[] }) {
  const [sel, setSel] = useState(0);
  return (
    <div className="airline-chips">
      {options.map((o, i) => (
        <button
          key={i}
          className={`airline-chip ${sel === i ? "selected" : ""}`}
          onClick={() => setSel(i)}
        >
          <span className="nm">{o.carrier}</span>
          <span className="du">{o.dur}</span>
          <span className="pr">{fmtUSD(o.price)}</span>
        </button>
      ))}
    </div>
  );
}
