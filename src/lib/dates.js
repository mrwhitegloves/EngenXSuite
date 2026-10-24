// The one way a moment (when something was added, changed, sent, is due) is written on the
// screens: "24 Oct 2026, 3:45 pm", in India time. A date that has no time of day (a lead's
// expected close date) keeps its own date-only format.

const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

/**
 * @param {string | number | Date | null | undefined} value
 * @param {string} [empty]  What to show when there is no moment
 */
export function formatDateTime(value, empty = '—') {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? empty : DATE_TIME.format(date);
}
