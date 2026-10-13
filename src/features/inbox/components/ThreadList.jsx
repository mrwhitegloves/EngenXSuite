import { CATEGORY_LABELS, MOOD_LABELS, formatMoment, whoOf } from '../mailFormat.js';

/**
 * Conversations as rows: who, subject, the newest line, and what state it is in.
 * @param {{ rows: object[], openId?: string, onOpen: (id: string) => void,
 *           showAccount?: boolean }} props
 */
export default function ThreadList({ rows, openId, onOpen, showAccount = true }) {
  return (
    <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface empty:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            aria-current={row.id === openId ? 'true' : undefined}
            onClick={() => onOpen(row.id)}
            className={`block w-full px-3 py-2 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-brand ${row.id === openId ? 'bg-page' : ''}`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className={`truncate ${row.isWaitingForUs ? 'font-semibold' : 'font-medium'}`}>
                {whoOf(row)}
                {row.messageCount > 1 && (
                  <span className="ml-1 text-xs font-normal text-text-muted">
                    {row.messageCount}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-text-muted">
                {formatMoment(row.lastMessageAt)}
              </span>
            </span>
            <span className="block truncate text-sm">{row.subject}</span>
            <span className="block truncate text-xs text-text-muted">{row.snippet}</span>
            <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {showAccount && row.account && (
                <span className="rounded-full border border-border px-1.5">{row.account.name}</span>
              )}
              {row.isWaitingForUs && (
                <span className="rounded-full border border-danger px-1.5 text-danger">
                  Waiting for us
                </span>
              )}
              {row.ai && (
                <span className="rounded-full border border-brand px-1.5 text-brand-text">
                  {CATEGORY_LABELS[row.ai.category]}
                </span>
              )}
              {row.ai && row.ai.sentiment !== 'neutral' && (
                <span
                  className={`rounded-full border px-1.5 ${row.ai.sentiment === 'negative' ? 'border-danger text-danger' : 'border-border'}`}
                >
                  {MOOD_LABELS[row.ai.sentiment]}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
