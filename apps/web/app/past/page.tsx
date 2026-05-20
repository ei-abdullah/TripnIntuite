"use client";

import { useRouter } from "next/navigation";
import { PAST, img } from "../lib/data";
import { useTripStore } from "../lib/tripStore";

export default function PastPage() {
  const router = useRouter();
  const setPrompt = useTripStore((s) => s.setPrompt);

  return (
    <main className="container fade-in">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <span>Archive</span>
          </div>
          <h2 className="serif">
            Past <em>searches</em>
          </h2>
        </div>
        <div className="eyebrow">{PAST.length} entries</div>
      </div>
      <div className="past-list stagger">
        {PAST.map((s) => (
          <div
            key={s.id}
            className="past-row"
            onClick={() => {
              setPrompt(s.prompt);
              router.push("/");
            }}
          >
            <div className="date">{s.date}</div>
            <div
              className="thumb"
              style={{ backgroundImage: `url(${img(s.thumb, 400)})` }}
            ></div>
            <div className="prompt-text serif">{s.prompt}</div>
            <div className="legs">
              {s.legs} {s.legs === 1 ? "Leg" : "Legs"}
            </div>
            <div className="arrow-end">→</div>
          </div>
        ))}
      </div>
    </main>
  );
}
