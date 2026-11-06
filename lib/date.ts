const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Today as YYYY-MM-DD in the configured timezone (server clock otherwise). */
export function todayISO(tz: string = process.env.APP_TIMEZONE || "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** "Thursday 5 November 2026" */
export function formatLong(isoDate: string): string {
  const { year, month, day } = parts(isoDate);
  const weekday = WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${day} ${MONTHS[month - 1]} ${year}`;
}

/** "5 November" */
export function formatShort(isoDate: string): string {
  const { month, day } = parts(isoDate);
  return `${day} ${MONTHS[month - 1]}`;
}

/** "November 2026" */
export function formatMonth(isoDate: string): string {
  const { year, month } = parts(isoDate);
  return `${MONTHS[month - 1]} ${year}`;
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function firstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Shift a YYYY-MM month key by n months. */
export function shiftMonth(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Monday-first weekday index (0 = Monday). */
export function mondayIndex(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return (day + 6) % 7;
}
