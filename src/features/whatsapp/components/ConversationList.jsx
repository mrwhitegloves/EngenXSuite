import { Ban, CheckCheck } from 'lucide-react';
import Avatar from '../../../components/shared/Avatar.jsx';
import { listTime } from '../waFormat.jsx';

/**
 * The chats as rows, like WhatsApp: picture, name, time, the last line, unread count.
 * @param {{ rows: object[], openId?: string, onOpen: (id: string) => void,
 *           showOwner?: boolean }} props
 */
export default function ConversationList({ rows, openId, onOpen, showOwner = false }) {
  return (
    <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto empty:hidden">
      {rows.map((row) => {
        const isOpen = row.id === openId;
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-current={isOpen ? 'true' : undefined}
              onClick={() => onOpen(row.id)}
              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${isOpen ? 'bg-page' : ''}`}
            >
              <Avatar name={row.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${row.unreadCount ? 'font-semibold' : 'font-medium'}`}>
                    {row.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${row.unreadCount ? 'font-semibold text-success' : 'text-text-muted'}`}
                  >
                    {listTime(row.lastMessageAt)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1 text-sm text-text-muted">
                    {row.lastDirection === 'outbound' && (
                      <CheckCheck size={14} aria-hidden="true" className="shrink-0" />
                    )}
                    <span className="truncate">
                      {row.lastDirection === 'outbound' && <span className="sr-only">You: </span>}
                      {row.snippet || (row.account ? row.account.name : row.phone)}
                    </span>
                  </span>
                  {row.unreadCount > 0 && (
                    <span
                      aria-label={`${row.unreadCount} unread`}
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success px-1.5 text-xs font-semibold text-surface"
                    >
                      {row.unreadCount}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {row.account && (
                    <span className="max-w-full truncate rounded-full border border-border px-1.5">
                      {row.account.name}
                    </span>
                  )}
                  {row.lead && (
                    <span className="rounded-full border border-border px-1.5 text-text-muted">
                      {row.lead.code}
                    </span>
                  )}
                  {!row.contact && (
                    <span className="rounded-full border border-warning px-1.5 text-warning">
                      Not in the CRM
                    </span>
                  )}
                  {row.needsReply && (
                    <span className="rounded-full border border-danger px-1.5 text-danger">
                      Needs reply
                    </span>
                  )}
                  {row.optedOut && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-danger px-1.5 text-danger">
                      <Ban size={10} aria-hidden="true" />
                      Opted out
                    </span>
                  )}
                  {showOwner && (
                    <span className="text-text-muted">
                      {row.assignedTo ? row.assignedTo.name : 'Nobody yet'}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
