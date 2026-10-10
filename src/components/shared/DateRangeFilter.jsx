import { compactInputClass } from './form.jsx';

// The ONE date filter used by every list, dashboard and report (Master Prompt Section 74).
// It only chooses; the server works out the actual moments (India-time days, end day included),
// so no screen has date logic of its own.
// The ids must match DATE_PRESETS in server/lib/dateRange.js.

export const DATE_PRESET_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  this_week: 'This week',
  this_month: 'This month',
  this_quarter: 'This quarter',
  this_fy: 'This financial year',
  last_month: 'Last month',
  last_quarter: 'Last quarter',
  last_fy: 'Last financial year',
  custom: 'Custom range',
};

/** Why a chosen range cannot be used yet, or '' when it is fine (or when nothing is chosen). */
export function dateRangeProblem({ range, from, to }) {
  if (range !== 'custom') return '';
  if (!from || !to) return 'Choose a start date and an end date.';
  if (from > to) return 'The start date must not be after the end date.';
  return '';
}

/**
 * The query values to send to the API for this choice: {} when nothing usable is chosen.
 * A half-filled custom range sends nothing, so the list is not filtered by a wrong range.
 */
export function dateRangeParams(value) {
  if (!value.range || dateRangeProblem(value)) return {};
  return value.range === 'custom'
    ? { range: 'custom', from: value.from, to: value.to }
    : { range: value.range };
}

/**
 * @param {{ label: string, value: { range?: string, from?: string, to?: string },
 *           onChange: (value: { range: string, from: string, to: string }) => void }} props
 *        label says WHICH date is filtered, for example "Date of change" or "Created".
 */
export default function DateRangeFilter({ label, value, onChange }) {
  const range = value.range ?? '';
  const problem = dateRangeProblem(value);

  return (
    <div className="flex flex-wrap items-start gap-2">
      <select
        aria-label={label}
        value={range}
        onChange={(event) => onChange({ range: event.target.value, from: '', to: '' })}
        className={`${compactInputClass}`}
      >
        <option value="">{label}: any time</option>
        {Object.entries(DATE_PRESET_LABELS).map(([id, text]) => (
          <option key={id} value={id}>
            {label}: {text}
          </option>
        ))}
      </select>

      {range === 'custom' && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label={`${label}: from`}
              value={value.from ?? ''}
              max={value.to || undefined}
              onChange={(event) => onChange({ ...value, range, from: event.target.value })}
              className={`${compactInputClass}`}
            />
            <span className="text-text-muted">to</span>
            <input
              type="date"
              aria-label={`${label}: to`}
              value={value.to ?? ''}
              min={value.from || undefined}
              onChange={(event) => onChange({ ...value, range, to: event.target.value })}
              className={`${compactInputClass}`}
            />
          </div>
          {problem && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {problem}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
