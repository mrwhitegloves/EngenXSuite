// Small date helpers of the calendar. Days are those of the person's own device (like every
// date-and-time field in the app); the server stores moments in UTC.

const pad = (number) => String(number).padStart(2, '0');

export const MODE_LABELS = {
  online: 'Online (Google Meet)',
  physical: 'Meeting in person',
  plant_visit: 'Plant visit',
};
export const STATUS_LABELS = {
  scheduled: 'Planned',
  completed: 'Held',
  cancelled: 'Cancelled',
  no_show: 'Customer did not come',
};

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addDays = (date, count) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
// Weeks start on Monday.
export const startOfWeek = (date) => addDays(date, -((date.getDay() + 6) % 7));

/** A day as "2026-10-12", and back. */
export const dayKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function parseDayKey(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : startOfDay(new Date());
}

/** A stored moment → the value of a date-and-time input. */
export function toMomentInput(value) {
  const date = new Date(value);
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The days a view shows around a date. Month: six full weeks. */
export function daysOf(view, date) {
  if (view === 'day') return [startOfDay(date)];
  const first =
    view === 'week'
      ? startOfWeek(date)
      : startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  return Array.from({ length: view === 'week' ? 7 : 42 }, (_, index) => addDays(first, index));
}

/** The date one step before (-1) or after (+1) in a view. */
export function stepFrom(view, date, direction) {
  if (view === 'month') return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  return addDays(date, direction * (view === 'week' ? 7 : 1));
}

export const formatTime = (value) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
export const formatDay = (date) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    date,
  );
export const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

/** The words above the calendar: "October 2026", "12 – 18 Oct 2026", "Mon, 12 Oct 2026". */
export function titleOf(view, date) {
  const format = (options, value = date) => new Intl.DateTimeFormat('en-IN', options).format(value);
  if (view === 'month') return format({ month: 'long', year: 'numeric' });
  if (view === 'day')
    return format({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const first = startOfWeek(date);
  return `${format({ day: 'numeric', month: 'short' }, first)} – ${format({ day: 'numeric', month: 'short', year: 'numeric' }, addDays(first, 6))}`;
}
