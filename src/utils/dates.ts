/** Number of years after installation that a PSV must be recertified. */
export const RECERT_INTERVAL_YEARS = 3;

/** Window (in days) before the due date during which a PSV is flagged "due soon". */
export const DUE_SOON_DAYS = 90;

/** Returns today's date as a YYYY-MM-DD string (local time). */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Formats a Date as YYYY-MM-DD (local time, no timezone shift). */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a local Date at midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Adds a whole number of years to a YYYY-MM-DD date string. */
export function addYears(iso: string, years: number): string {
  const d = parseISODate(iso);
  d.setFullYear(d.getFullYear() + years);
  return toISODate(d);
}

/** Whole-day difference between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Human-friendly long date, e.g. "Mar 14, 2027". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return parseISODate(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Human-friendly date + time from an ISO datetime string. */
export function formatDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Relative phrasing for a day count, e.g. "in 42 days" / "12 days ago". */
export function relativeDays(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'due today';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  const abs = Math.abs(days);
  return `${abs} day${abs === 1 ? '' : 's'} overdue`;
}
