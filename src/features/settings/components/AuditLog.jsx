import { ScrollText } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable.jsx';
import DateRangeFilter, {
  DATE_PRESET_LABELS,
  dateRangeParams,
} from '../../../components/shared/DateRangeFilter.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useListParams } from '../../../hooks/useListParams.js';
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

const COLUMNS = [
  {
    key: 'at',
    header: 'When',
    className: 'whitespace-nowrap text-text-muted',
    render: (row) => formatDate(row.at),
  },
  {
    key: 'user',
    header: 'Who',
    className: 'whitespace-nowrap',
    render: (row) => (row.user ? (row.user.name ?? 'Deleted user') : 'The system'),
  },
  { key: 'action', header: 'What', render: (row) => readable(row.action) },
  {
    key: 'record',
    header: 'Record',
    render: (row) => (
      <>
        <div>{row.entityName ?? 'No longer exists'}</div>
        <div className="text-text-muted">{readable(row.entityType)}</div>
      </>
    ),
  },
  {
    key: 'changes',
    header: 'Changes',
    className: 'max-w-md',
    render: (row) => <Changes oldValue={row.oldValue} newValue={row.newValue} />,
  },
];

// Settings → Audit log: who changed what and when. Read-only. Filters and page are kept in the
// address, so a filtered view can be bookmarked or shared.
export default function AuditLog() {
  const list = useListParams(FILTER_KEYS);
  const { userId, entityType, action, range, from, to } = list.values;
  const dates = { range, from, to };

  const options = useAuditOptions();
  const logs = useAuditLogs({
    page: list.page,
    userId,
    entityType,
    action,
    ...dateRangeParams(dates),
  });

  const rows = logs.data?.data ?? [];
  const userName =
    userId === 'system'
      ? 'The system'
      : (options.data?.users.find((user) => user.id === userId)?.name ?? 'One user');

  const chips = [
    userId && {
      key: 'userId',
      label: `Who: ${userName}`,
      onRemove: () => list.setFilters({ userId: '' }),
    },
    entityType && {
      key: 'entityType',
      label: `Record type: ${readable(entityType)}`,
      onRemove: () => list.setFilters({ entityType: '' }),
    },
    action && {
      key: 'action',
      label: `Action: ${readable(action)}`,
      onRemove: () => list.setFilters({ action: '' }),
    },
    range && {
      key: 'range',
      label:
        range === 'custom' && from && to
          ? `Date of change: ${from} to ${to}`
          : `Date of change: ${DATE_PRESET_LABELS[range] ?? range}`,
      onRemove: () => list.setFilters({ range: '', from: '', to: '' }),
    },
  ].filter(Boolean);

  return (
    <div>
      <FilterBar
        chips={chips}
        onClearAll={list.clearFilters}
        savedViews={{ screen: 'audit-log', currentQuery: list.viewQuery, onApply: list.applyView }}
      >
        <select
          aria-label="Filter by user"
          value={userId}
          onChange={(event) => list.setFilters({ userId: event.target.value })}
          className={`${compactInputClass}`}
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
          value={entityType}
          onChange={(event) => list.setFilters({ entityType: event.target.value })}
          className={`${compactInputClass}`}
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
          value={action}
          onChange={(event) => list.setFilters({ action: event.target.value })}
          className={`${compactInputClass}`}
        >
          <option value="">All actions</option>
          {(options.data?.actions ?? []).map((item) => (
            <option key={item} value={item}>
              {readable(item)}
            </option>
          ))}
        </select>
        <DateRangeFilter label="Date of change" value={dates} onChange={list.setFilters} />
      </FilterBar>

      <FormError message={logs.error?.message ?? options.error?.message} />

      {logs.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading the audit log…
        </p>
      )}

      {logs.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title={list.hasFilters ? 'Nothing matches these filters' : 'Nothing recorded yet'}
          description={
            list.hasFilters
              ? 'Change or clear the filters.'
              : 'Changes to users, permissions and records will appear here.'
          }
        />
      )}

      {rows.length > 0 && (
        <DataTable
          caption="Audit log"
          columns={COLUMNS}
          rows={rows}
          isRefreshing={logs.isPlaceholderData}
        />
      )}

      <Pagination meta={logs.data?.meta} noun={['entry', 'entries']} onPageChange={list.setPage} />
    </div>
  );
}
