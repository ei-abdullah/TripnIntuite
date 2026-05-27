import {fmtClock} from "../lib/dates";

export default function FlightSummary({
  from,
  to,
  dur,
  via = [],
  depTime,
  arrTime,
}: {
  from: string;
  to: string;
  dur: string;
  via?: string[];
  depTime?: string;
  arrTime?: string;
}) {
  const stopsLabel =
    via.length === 0
      ? "Direct"
      : `${via.length} stop${via.length > 1 ? "s" : ""}`;

  return (
    <div className="flight-summary">
      <div className="ap serif">
        {from}
        <small>
          {depTime ? `${fmtClock(depTime)} · ` : ""}Departure
        </small>
      </div>
      <div className="arc">
        <span className="a"></span>
        <span className="l">
          {dur} · {stopsLabel}
        </span>
        {via.map((code, i) => {
          const pct = ((i + 1) / (via.length + 1)) * 100;
          return (
            <span key={i} className="stop" style={{ left: `${pct}%` }}>
              <span className="stop-dot" />
              <span className="stop-label">{code}</span>
            </span>
          );
        })}
        <span className="b"></span>
      </div>
      <div className="ap right serif">
        {to}
        <small>
          {arrTime ? `${fmtClock(arrTime)} · ` : ""}Arrival
        </small>
      </div>
    </div>
  );
}