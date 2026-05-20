"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTripStore } from "../lib/tripStore";
import LegStepper from "../components/LegStepper";

export default function SelectPage() {
  const router = useRouter();
  const intuitions = useTripStore((s) => s.intuitions);
  const picks = useTripStore((s) => s.picks);
  const setPick = useTripStore((s) => s.setPick);

  useEffect(() => {
    if (intuitions.length === 0) router.replace("/");
  }, [intuitions.length, router]);

  if (intuitions.length === 0) return null;

  const allPicked = intuitions.every((_, i) => picks[i]);

  return (
    <main className="container fade-in" style={{ paddingBottom: 0 }}>
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Plan</Link>
            <span className="sep">/</span>
            <span>Locations</span>
          </div>
          <h2 className="serif">
            Choose <em>where</em>, intuition by intuition
          </h2>
        </div>
        <div className="eyebrow">
          {intuitions.length} groups · pick one each
        </div>
      </div>

      <LegStepper groups={intuitions} picks={picks} />

      {intuitions.map((g, gi) => (
        <section key={gi} className="intuition-group">
          <div className="intuition-group-head">
            <div>
              <div className="lab">
                Intuition {String(gi + 1).padStart(2, "0")} — {g.theme}
              </div>
              <h3 className="serif">
                {g.segment.charAt(0).toUpperCase() + g.segment.slice(1)}
              </h3>
            </div>
            <div className="right">{g.cards.length} matches</div>
          </div>

          <div className="dest-grid stagger">
            {g.cards.map((c, ci) => {
              const selected = picks[gi]?.id === c.id;
              return (
                <article
                  key={c.id}
                  className={`dest-card ${selected ? "selected" : ""}`}
                  onClick={() => setPick(gi, c)}
                >
                  <div
                    className="img"
                    style={{ backgroundImage: `url(${c.img})` }}
                  ></div>
                  <div className="top-line">
                    <span>No. {String(ci + 1).padStart(2, "0")}</span>
                    <span className="match num">
                      {c.match}
                      <small>match</small>
                    </span>
                  </div>
                  <h4 className="serif">{c.name}</h4>
                  <div className="city">
                    {c.country} · nearest city {c.nearest}
                  </div>
                  <p className="why">{c.blurb}</p>
                  <span className="select-pill">
                    Select <span>→</span>
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <div className="selection-footer">
        <span className="status">
          {Object.keys(picks).length} of {intuitions.length} selected
        </span>
        <button
          className="btn-accent"
          onClick={() => router.push("/plan")}
          disabled={!allPicked}
        >
          Set Dates & Duration <span>→</span>
        </button>
      </div>
    </main>
  );
}
