// Small helpers for showing a lead, shared by the table, the board and the lead page.

const DAY_MS = 24 * 60 * 60 * 1000;

/** "12 Oct 2026", as that day is in India; "—" when there is no date. */
export const formatDay = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(
        new Date(value),
      )
    : '—';

/** "12 Oct 2026, 3:30 pm" in India time. */
export const formatMoment = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(value))
    : '—';

/** "today", "1 day", "12 days": how long the lead has been in its stage. */
export function daysInStage(enteredAt, now) {
  const days = Math.floor((now - new Date(enteredAt)) / DAY_MS);
  if (days <= 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** "3 days", "5 hours", "less than an hour": a length of time from milliseconds. */
export function formatDuration(ms) {
  if (ms === null || ms === undefined) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return 'less than an hour';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
