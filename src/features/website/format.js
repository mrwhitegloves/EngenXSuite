// Words and numbers of the Website screen, in one place.

/** 95 → "1m 35s", 40 → "40s", 0 → "0s". */
export function formatStay(seconds) {
  const total = Math.round(seconds ?? 0);
  if (total <= 0) return '0s';
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

/** How long a visitor stayed, as a colour: short (red), medium (amber), long (green). */
export function stayTone(seconds) {
  if (!seconds || seconds < 15) return 'border-danger text-danger';
  if (seconds < 60) return 'border-warning text-warning';
  return 'border-success text-success';
}

/**
 * The short code shown for a visitor's country ("IN", "AE"). A code rather than a flag emoji:
 * Windows does not draw flag emojis. The website marks a local developer visit "LCL".
 */
export function countryBadge(countryCode) {
  if (countryCode === 'LCL') return 'Local';
  return countryCode && countryCode.length === 2 ? countryCode.toUpperCase() : '—';
}

const NUMBER = new Intl.NumberFormat('en-IN');
export const formatNumber = (value) => NUMBER.format(value ?? 0);

const DAY_LABEL = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A chart point's label: "3 Oct" for a day ("2026-10-03"), "Oct 2026" for a month ("2026-10"). */
export function pointLabel(date, unit) {
  return unit === 'month'
    ? MONTH_LABEL.format(new Date(`${date}-01T00:00:00Z`))
    : DAY_LABEL.format(new Date(`${date}T00:00:00Z`));
}

/** A referrer as people read it: "https://www.google.com/" → "google.com". */
export function sourceName(referrer) {
  if (!referrer || referrer === 'Direct') return 'Direct';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pages', label: 'Pages & Sources' },
  { id: 'sessions', label: 'Visitor Sessions' },
  { id: 'leads', label: 'Contact Leads' },
];
