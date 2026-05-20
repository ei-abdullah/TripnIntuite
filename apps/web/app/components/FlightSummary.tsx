export default function FlightSummary({
  from,
  to,
  dur,
}: {
  from: string;
  to: string;
  dur: string;
}) {
  return (
    <div className="flight-summary">
      <div className="ap serif">
        {from}
        <small>Departure</small>
      </div>
      <div className="arc">
        <span className="a"></span>
        <span className="l">{dur}</span>
        <span className="b"></span>
      </div>
      <div className="ap right serif">
        {to}
        <small>Arrival</small>
      </div>
    </div>
  );
}
