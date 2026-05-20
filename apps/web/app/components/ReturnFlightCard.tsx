import type { AirlineOption } from "../lib/data";
import FlightSummary from "./FlightSummary";
import AirlineChips from "./AirlineChips";

export default function ReturnFlightCard({
  from,
  to,
  dateLabel,
  airlines,
}: {
  from: string;
  to: string;
  dateLabel: string;
  airlines: AirlineOption[];
}) {
  return (
    <article className="leg-card return-card">
      <div className="leg-card-head">
        <div>
          <div className="lab">Return · home</div>
          <h3 className="serif">
            Back to <em>New York</em>
          </h3>
        </div>
        <div className="dates">{dateLabel}</div>
      </div>
      <div className="leg-body">
        <div>
          <div className="leg-section">
            <div className="title">
              <strong>Flight</strong> <span>Return</span>
            </div>
            <FlightSummary from={from} to={to} dur={airlines[0].dur} />
            <AirlineChips options={airlines} />
          </div>
        </div>
        <div></div>
      </div>
    </article>
  );
}
