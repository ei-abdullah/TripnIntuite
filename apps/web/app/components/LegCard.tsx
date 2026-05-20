import type { AirlineOption, Destination } from "../lib/data";
import { HOTELS } from "../lib/data";
import FlightSummary from "./FlightSummary";
import AirlineChips from "./AirlineChips";
import { fmtUSD } from "../lib/dates";

export default function LegCard({
  leg,
  prevDest,
  from,
  to,
  dateRange,
  flightDateLabel,
  airlines,
  idx,
  total,
}: {
  leg: Destination;
  prevDest: Destination | null;
  from: string;
  to: string;
  dateRange: string;
  flightDateLabel: string;
  airlines: AirlineOption[];
  idx: number;
  total: number;
}) {
  const hotels = HOTELS[leg.id] || [];
  return (
    <article className="leg-card">
      <div className="leg-card-head">
        <div>
          <div className="lab">
            Leg {String(idx + 1).padStart(2, "0")} of{" "}
            {String(total).padStart(2, "0")}
          </div>
          <h3 className="serif">
            {leg.name}, <em>{leg.country}</em>
          </h3>
        </div>
        <div className="dates">{dateRange}</div>
      </div>

      <div className="leg-body">
        <div>
          <div className="leg-section">
            <div className="title">
              <strong>Flight</strong>{" "}
              <span>
                {prevDest
                  ? `${prevDest.name} → ${leg.name}`
                  : `Home → ${leg.name}`}
              </span>{" "}
              <span style={{ marginLeft: "auto" }}>{flightDateLabel}</span>
            </div>
            <FlightSummary from={from} to={to} dur={airlines[0].dur} />
            <AirlineChips options={airlines} />
          </div>

          <div className="leg-section">
            <div className="title">
              <strong>Hotels</strong>{" "}
              <span>vetted picks from Booking.com</span>
            </div>
            {hotels.map((h, i) => (
              <div key={i} className="hotel-row">
                <div>
                  <div className="nm serif">{h.name}</div>
                  <div className="meta">
                    {"★".repeat(h.stars)}
                    {"☆".repeat(5 - h.stars)} · {h.reviews.toLocaleString()}{" "}
                    reviews
                  </div>
                </div>
                <div className="score">
                  <div className="v num">{h.score.toFixed(1)}</div>
                  <small>Review</small>
                </div>
                <div className="price">
                  <div className="amt num">{fmtUSD(h.price)}</div>
                  <small>per night</small>
                </div>
              </div>
            ))}
          </div>

          <div className="leg-section">
            <div className="title">
              <strong>Sites to visit</strong>{" "}
              <span>recommended by TripIntuition</span>
            </div>
            <div className="sites-chips">
              {leg.sites.map((s, i) => (
                <span key={i} className="site-chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="leg-section">
            <div className="title">
              <strong>Map</strong>{" "}
              <span>
                {leg.nearest}, {leg.country}
              </span>
            </div>
            <div className="map-block">
              <div className="map-pin">
                <div className="pin"></div>
                <div className="pin-base"></div>
                <div className="pin-label serif">{leg.name}</div>
              </div>
            </div>
            <div className="map-foot">
              <span>Lat / long indicative</span>
              <span>{leg.tz.replace("_", " ")}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
