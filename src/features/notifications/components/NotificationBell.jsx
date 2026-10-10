import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotificationActions, useNotifications, useUnreadCount } from '../api.js';

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

/** One notification as a row: used by the bell's panel and by the Notifications page. */
export function NotificationRow({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
    >
      {/* A dot marks what has not been read yet. */}
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-brand'}`}
      />
      <span className="min-w-0 flex-1">
        <span className={`block break-words ${item.isRead ? '' : 'font-medium'}`}>
          {item.title}
          {!item.isRead && <span className="sr-only"> (not read)</span>}
        </span>
        {item.body && <span className="block break-words text-text-muted">{item.body}</span>}
        <span className="block text-xs text-text-muted">{formatMoment(item.createdAt)}</span>
      </span>
    </button>
  );
}

/** Opening a notification marks it as read and goes to what it is about. */
export function useOpenNotification(onDone) {
  const navigate = useNavigate();
  const actions = useNotificationActions();
  return (item) => {
    if (!item.isRead) actions.read.mutate(item.id);
    onDone?.();
    if (item.link) navigate(item.link);
  };
}

// The bell in the top bar: how many notifications are unread, and the newest ones in a panel.
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef(null);
  const unread = useUnreadCount();
  const latest = useNotifications({ pageSize: 8 }, { enabled: isOpen });
  const actions = useNotificationActions();
  const open = useOpenNotification(() => setIsOpen(false));
  const count = unread.data ?? 0;
  const rows = latest.data?.data ?? [];

  // A click outside the panel, or Escape, closes it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (event) => {
      if (!container.current?.contains(event.target)) setIsOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={count > 0 ? `Notifications, ${count} not read` : 'Notifications'}
        title="Notifications"
        className="relative rounded-md border border-border p-2 text-text-muted transition-colors hover:border-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Bell size={16} aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-4.5 rounded-full bg-brand px-1 text-center text-[0.65rem] leading-4.5 font-semibold text-on-brand"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          aria-label="Newest notifications"
          className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-xl max-sm:fixed max-sm:top-14 max-sm:right-4"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {count > 0 && (
              <button
                type="button"
                className="text-xs text-brand-text hover:underline"
                disabled={actions.readAll.isPending}
                onClick={() => actions.readAll.mutate()}
              >
                Mark all as read
              </button>
            )}
          </header>
          {latest.isPending && (
            <p role="status" className="px-3 py-4 text-sm text-text-muted">
              Loading…
            </p>
          )}
          {latest.isError && (
            <p role="alert" className="px-3 py-4 text-sm text-danger">
              {latest.error.message}
            </p>
          )}
          {latest.isSuccess && rows.length === 0 && (
            <p className="px-3 py-4 text-sm text-text-muted">Nothing yet.</p>
          )}
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {rows.map((item) => (
              <li key={item.id}>
                <NotificationRow item={item} onOpen={open} />
              </li>
            ))}
          </ul>
          <footer className="border-t border-border px-3 py-2 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-sm text-brand-text hover:underline"
            >
              See all, and settings
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
