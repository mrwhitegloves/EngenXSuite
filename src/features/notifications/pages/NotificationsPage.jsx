import { Bell } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import DateRangeFilter, {
  DATE_PRESET_LABELS,
  dateRangeParams,
} from '../../../components/shared/DateRangeFilter.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useListParams } from '../../../hooks/useListParams.js';
import {
  useNotificationActions,
  useNotificationPreferences,
  useNotifications,
  useUnreadCount,
} from '../api.js';
import { NotificationRow, useOpenNotification } from '../components/NotificationBell.jsx';

// The switches: all notifications on or off, and each kind on its own.
function Preferences() {
  const preferences = useNotificationPreferences();
  const actions = useNotificationActions();
  const data = preferences.data;
  const isBusy = actions.setPreferences.isPending;

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">What I want to be told</h2>
      <FormError message={preferences.error?.message ?? actions.setPreferences.error?.message} />
      {data && (
        <div className="mt-3 space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-brand"
              checked={data.enabled}
              disabled={isBusy}
              onChange={(event) => actions.setPreferences.mutate({ enabled: event.target.checked })}
            />
            <span>
              <span className="font-medium">Notifications</span>
              <span className="block text-text-muted">
                Switched off: nothing is created for me, and nothing that happened meanwhile comes
                back when I switch it on again.
              </span>
            </span>
          </label>
          <fieldset
            disabled={!data.enabled || isBusy}
            className="space-y-2 pl-6 disabled:opacity-60"
          >
            <legend className="sr-only">Kinds of notification</legend>
            {data.types.map((item) => (
              <label key={item.type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={item.enabled}
                  onChange={(event) =>
                    actions.setPreferences.mutate({ types: { [item.type]: event.target.checked } })
                  }
                />
                {item.label}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </section>
  );
}

// Notifications: everything I was told, with search and filters, and my switches.
export default function NotificationsPage() {
  const list = useListParams(['search', 'unread', 'range', 'from', 'to']);
  const { search, unread } = list.values;
  const dates = { range: list.values.range, from: list.values.from, to: list.values.to };
  const notifications = useNotifications({
    page: list.page,
    search,
    unread,
    ...dateRangeParams(dates),
  });
  const unreadCount = useUnreadCount();
  const actions = useNotificationActions();
  const open = useOpenNotification();
  const rows = notifications.data?.data ?? [];

  const chip = (key, label, clear = { [key]: '' }) => ({
    key,
    label,
    onRemove: () => list.setFilters(clear),
  });
  const chips = [
    search && chip('search', `Search: ${search}`),
    unread && chip('unread', 'Not read'),
    dates.range &&
      chip(
        'range',
        dates.range === 'custom' && dates.from && dates.to
          ? `${dates.from} to ${dates.to}`
          : (DATE_PRESET_LABELS[dates.range] ?? dates.range),
        { range: '', from: '', to: '' },
      ),
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Notifications" description="What the system told you.">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!unreadCount.data || actions.readAll.isPending}
          onClick={() => actions.readAll.mutate()}
        >
          Mark all as read
        </button>
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <FilterBar
            search={{
              value: search,
              onChange: (text) => list.setFilters({ search: text }),
              placeholder: 'Search notifications',
              label: 'Search notifications',
            }}
            chips={chips}
            onClearAll={list.clearFilters}
          >
            <select
              aria-label="Read or not read"
              value={unread}
              onChange={(event) => list.setFilters({ unread: event.target.value })}
              className={compactInputClass}
            >
              <option value="">Read and not read</option>
              <option value="true">Not read only</option>
            </select>
            <DateRangeFilter label="Received" value={dates} onChange={list.setFilters} />
          </FilterBar>

          <FormError message={notifications.error?.message} />
          {notifications.isPending && (
            <p role="status" className="p-4 text-text-muted">
              Loading…
            </p>
          )}
          {notifications.isSuccess && rows.length === 0 && (
            <EmptyState
              icon={Bell}
              title={list.hasFilters ? 'Nothing matches these filters' : 'No notifications yet'}
              description={
                list.hasFilters
                  ? 'Change or clear the filters.'
                  : 'You are told here when a task or a lead is given to you, and when a task is due or overdue.'
              }
            />
          )}
          {rows.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {rows.map((item) => (
                <li key={item.id}>
                  <NotificationRow item={item} onOpen={open} />
                </li>
              ))}
            </ul>
          )}
          <Pagination
            meta={notifications.data?.meta}
            noun={['notification', 'notifications']}
            onPageChange={list.setPage}
          />
        </div>
        <Preferences />
      </div>
    </>
  );
}
