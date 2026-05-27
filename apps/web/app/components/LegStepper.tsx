import {Fragment} from "react";
import type {Destination} from "../lib/data";
import type {Intuition} from "../lib/api";

export default function LegStepper({
  groups,
  picks,
}: {
  groups: Intuition[];
  picks: Record<number, Destination>;
}) {
  return (
    <div className="leg-stepper">
      {groups.map((_, i) => {
        const picked = picks[i];
        const firstUnfilled = groups.findIndex((__, j) => !picks[j]);
        const cls = picked ? "done" : i === firstUnfilled ? "current" : "";
        return (
          <Fragment key={i}>
            <div className={`leg-step ${cls}`}>
              <span className="dot"></span>
              <span className="label">
                Intuition {String(i + 1).padStart(2, "0")}
              </span>
              {picked && <span className="place">{picked.name}</span>}
            </div>
            {i < groups.length - 1 && <span className="leg-rule"></span>}
          </Fragment>
        );
      })}
    </div>
  );
}
