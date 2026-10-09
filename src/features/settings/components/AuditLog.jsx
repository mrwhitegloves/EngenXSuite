import { ScrollText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import DateRangeFilter, { dateRangeParams } from '../../../components/shared/DateRangeFilter.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, inputClass, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useAuditLogs, useAuditOptions } from '../api.js';

const FILTER_KEYS = ['userId', 'entityType', 'action', 'range', 'from', 'to'];

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

// "user.password_changed_by_admin" → "User: password changed by admin"
function readable(name) {
  const [first, ...rest] = name.split('.');
  const words = (text) => text.replaceAll('_', ' ');
  const head = words(first).replace(/^./, (letter) => letter.toUpperCase());
  return rest.length ? `${head}: ${words(rest.join(' '))}` : head;
}

function showValue(value) {
  if (value === null || value === undefined || value === '') return 'empty';
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// The fields an entry changed, as "field: old → new".
function Changes({ oldValue, newValue }) {
  const fields = [...new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})])];
  if (fields.length === 0) return <span className="text-text-muted">No details</span>;
  return (
    <ul className="space-y-0.5">
      {fields.map((field) => (
        <li key={field} className="break-words">
          <span className="text-text-muted">{field}: </span>
          {oldValue && field in oldValue && (
            <>
              <span className="line-through decoration-text-muted">
                {showValue(oldValue[field])}
              </span>
              {' → '}
            </>
          )}
          <span>{newValue && field in newValue ? showValue(newValue[field]) : 'removed'}</span>
        </li>
      ))}
    </ul>
  );
}

// Settings → Audit log: who changed what and when. Read-only. Filters and page are kept in the
// address, so a filtered view can be bookmarked or shared.
export default function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? '']));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const dates = { range: filters.range, from: filters.from, to: filters.to };

  const options = useAuditOptions();
  const logs = useAuditLogs({
    page,
    userId: filters.userId,
    entityType: filters.entityType,
    action: filters.action,
    ...dateRangeParams(dates),
  });

  // Change some address values, keep the others. An empty value is removed from the address.
  function update(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  }
  const setFilter = (changes) => update({ ...changes, page: '' });

  const rows = logs.data?.data ?? [];
  const meta = logs.data?.meta;
  const pageCount = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const hasFilters = FILTER_KEYS.some((key) => filters[key]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <select
          aria-label="Filter by user"
          value={filters.userId}
          onChange={(event) => setFilter({ userId: event.target.value })}
          className={`${inputClass} w-auto`}
        >
          <option value="">Anyone</option>
          <option value="system">The system</option>
          {(options.data?.users ?? []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by record type"
          value={filters.entityType}
          onChange={(event) => setFilter({ entityType: event.target.value })}
          className={`${inputClass} w-auto`}
        >
          <option value="">All record types</option>
          {(options.data?.entityTypes ?? []).map((type) => (
            <option key={type} value={type}>
              {readable(type)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by action"
          value={filters.action}
          onChange={(event) => setFilter({ action: event.target.value })}
          className={`${inputClass} w-auto`}
        >
          <option value="">All actions</option>
          {(options.data?.actions ?? []).map((action) => (
            <option key={action} value={action}>
              {readable(action)}
            </option>
          ))}
        </select>
        <DateRangeFilter label="Date of change" value={dates} onChange={setFilter} />
        {hasFilters && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setFilter(Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])))}
          >
            Clear all
          </button>
        )}
      </div>

      <FormError message={logs.error?.message ?? options.error?.message} />

      {logs.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading the audit log…
        </p>
      )}

      {logs.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title={hasFilters ? 'Nothing matches these filters' : 'Nothing recorded yet'}
          description={
            hasFilters
              ? 'Change or clear the filters.'
              : 'Changes to users, permissions and records will appear here.'
          }
        />
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">What</th>
                <th className="px-4 py-2 font-medium">Record</th>
                <th className="px-4 py-2 font-medium">Changes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap text-text-muted">
                    {formatDate(row.at)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {row.user ? (row.user.name ?? 'Deleted user') : 'The system'}
                  </td>
                  <td className="px-4 py-2">{readable(row.action)}</td>
                  <td className="px-4 py-2">
                    <div>{row.entityName ?? 'No longer exists'}</div>
                    <div className="text-text-muted">{readable(row.entityType)}</div>
                  </td>
                  <td className="max-w-md px-4 py-2">
                    <Changes oldValue={row.oldValue} newValue={row.newValue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-text-muted">
            Page {meta.page} of {pageCount} · {meta.total} {meta.total === 1 ? 'entry' : 'entries'}
          </span>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={page <= 1}
            onClick={() => update({ page: page > 2 ? String(page - 1) : '' })}
          >
            Previous
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={page >= pageCount}
            onClick={() => update({ page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
