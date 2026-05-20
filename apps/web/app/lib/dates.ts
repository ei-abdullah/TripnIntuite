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