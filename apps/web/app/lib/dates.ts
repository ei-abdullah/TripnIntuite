export function parseDate(str: string): Date {
  if (!str) return new Date();
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmtDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function fmtRange(a: Date, b: Date): string {
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  if (sameMonth) {
    const m = a.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `${m} ${a.getUTCDate()} — ${b.getUTCDate()}, ${a.getUTCFullYear()}`;
  }
  return `${fmtDateShort(a)} — ${fmtDateShort(b)}, ${a.getUTCFullYear()}`;
}

export function addDays(date: Date, days: number): Date {
  const r = new Date(date.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export function fmtUSD(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

export function fmtISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function fmtClock(iso: string): string {
  const t = iso.split("T")[1];
  if (!t) return iso;
  return t.slice(0, 5);
}