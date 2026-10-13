import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Paperclip, PenSquare, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FormError } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useMailActions, useThread } from '../api.js';
import {
  CATEGORY_LABELS,
  MOOD_LABELS,
  formatMoment,
  formatSize,
  smallButton,
  splitQuoted,
} from '../mailFormat.js';
import MailComposer from './MailComposer.jsx';
import { RelinkPanel } from './MailLinks.jsx';
import ThreadAiTools, { FileSummary } from './ThreadAiTools.jsx';

// A file of a message: opens (or downloads) through a link that works for an hour.
function FileChip({ file }) {
  const inner = (
    <>
      <Paperclip size={11} aria-hidden="true" />
      <span className="truncate">{file.filename}</span>
      <span className="shrink-0 text-text-muted">
        {file.link ? formatSize(file.size) : 'open it in Gmail'}
      </span>
    </>
  );
  const shape =
    'inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs';
  return file.link ? (
    <a
      href={file.link}
      target="_blank"
      rel="noreferrer"
      title="Open or download"
      className={`${shape} hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand`}
    >
      {inner}
    </a>
  ) : (
    <span className={shape}>{inner}</span>
  );
}

// One mail of the conversation. Closed, it is one line; open, its text and files.
function Message({ message, isOpen, onToggle }) {
  const [showsQuoted, setShowsQuoted] = useState(false);
  const { main, quoted } = splitQuoted(message.text || '');
  const isOurs = message.direction === 'outbound';
  return (
    <li
      className={`rounded-lg border text-sm ${isOurs ? 'border-brand bg-brand-soft' : 'border-border bg-page'}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-baseline gap-2 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand"
      >
        {isOpen ? (
          <ChevronDown size={14} aria-hidden="true" className="shrink-0 self-center" />
        ) : (
          <ChevronRight size={14} aria-hidden="true" className="shrink-0 self-center" />
        )}
        <span className="shrink-0 font-medium">
          {isOurs ? 'We wrote' : (message.fromName ?? message.from)}
        </span>
        <span className="min-w-0 flex-1 truncate text-text-muted">
          {isOpen ? `to ${message.to.join(', ')}` : main.replace(/\s+/g, ' ')}
        </span>
        {message.attachments.length > 0 && (
          <span className="inline-flex shrink-0 items-center gap-0.5 self-center text-xs text-text-muted">
            <Paperclip size={11} aria-hidden="true" />
            {message.attachments.length}
          </span>
        )}
        <span className="shrink-0 text-xs text-text-muted">{formatMoment(message.sentAt)}</span>
      </button>
      {isOpen && (
        <div className="space-y-2 px-3 pb-3">
          {message.cc.length > 0 && (
            <p className="text-xs text-text-muted">Cc: {message.cc.join(', ')}</p>
          )}
          <p className="break-words whitespace-pre-wrap">{main || '(no text)'}</p>
          {quoted && (
            <>
              <button
                type="button"
                className={smallButton}
                aria-expanded={showsQuoted}
                onClick={() => setShowsQuoted((value) => !value)}
              >
                {showsQuoted ? 'Hide the earlier mails' : 'Show the earlier mails below it'}
              </button>
              {showsQuoted && (
                <p className="border-l-2 border-border pl-2 break-words whitespace-pre-wrap text-text-muted">
                  {quoted}
                </p>
              )}
            </>
          )}
          {message.attachments.length > 0 && (
            <ul aria-label="Files" className="flex flex-wrap gap-1.5">
              {message.attachments.map((file, index) => (
                // A mail may carry two files of one name: the position tells them apart.
                <li
                  key={`${index}-${file.filename}`}
                  className="flex max-w-full flex-wrap items-center"
                >
                  <FileChip file={file} />
                  {file.url && <FileSummary file={file} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * One conversation, the way a mail program shows it: every mail in order with its files, the
 * newest one open; the AI's reading; and the box to write the next mail in the same conversation.
 *
 * @param {{ threadId: string, onBack: () => void, onNewConversation?: (thread: object) => void }} props
 *        onNewConversation: start a separate conversation with the same person
 */
export default function ThreadView({ threadId, onBack, onNewConversation }) {
  const thread = useThread(threadId);
  const { classify } = useMailActions(threadId);
  const can = useCan();
  const data = thread.data;
  // Which mails are open, when the person chose; otherwise only the newest one.
  const [chosen, setChosen] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const openIds = chosen ?? new Set(data ? [data.messages.at(-1)?.id] : []);
  const toggle = (id) => {
    const next = new Set(openIds);
    if (!next.delete(id)) next.add(id);
    setChosen(next);
  };
  const fileCount = data?.messages.reduce((sum, message) => sum + message.attachments.length, 0);

  return (
    <section
      aria-label="Conversation"
      className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-surface"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 border-b border-border px-3 py-2 text-sm text-text-muted lg:hidden"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All conversations
      </button>
      <FormError message={thread.error?.message} />
      {thread.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading…
        </p>
      )}
      {data && (
        <>
          <header className="space-y-1 border-b border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="min-w-0 font-semibold break-words">{data.subject}</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.messages.length > 1 && (
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() =>
                      setChosen(
                        openIds.size === data.messages.length
                          ? new Set()
                          : new Set(data.messages.map((message) => message.id)),
                      )
                    }
                  >
                    {openIds.size === data.messages.length ? 'Close all' : 'Open all'}
                  </button>
                )}
                {data.permissions.canReply && (
                  <button
                    type="button"
                    className={smallButton}
                    aria-expanded={isLinking}
                    onClick={() => setIsLinking((value) => !value)}
                  >
                    Change the company or lead
                  </button>
                )}
                {onNewConversation && can('email', 'create') && (
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => onNewConversation(data)}
                  >
                    <PenSquare size={12} aria-hidden="true" />
                    New conversation
                  </button>
                )}
              </div>
            </div>
            {isLinking && <RelinkPanel thread={data} onClose={() => setIsLinking(false)} />}
            <p className="text-sm text-text-muted">
              {data.account ? (
                <Link
                  to={`/accounts/${data.account.id}`}
                  className="hover:text-brand-text hover:underline"
                >
                  {data.account.name}
                </Link>
              ) : (
                'Not linked to a company'
              )}
              {data.lead && (
                <>
                  {' · Lead: '}
                  <Link
                    to={`/pipeline/${data.lead.id}`}
                    className="hover:text-brand-text hover:underline"
                  >
                    {data.lead.name}
                  </Link>
                </>
              )}
              {data.owner && <> · Mailbox of {data.owner.name}</>}
              {' · '}
              {data.messages.length} {data.messages.length === 1 ? 'mail' : 'mails'}
              {fileCount > 0 && `, ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
            </p>
            {data.ai ? (
              <div className="rounded-md border border-border bg-page p-2 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand-text">
                    <Sparkles size={11} aria-hidden="true" />
                    AI
                  </span>
                  <span className="font-medium">{CATEGORY_LABELS[data.ai.category]}</span>
                  {data.ai.needsReply && <span className="text-danger">Needs an answer</span>}
                  {data.ai.sentiment !== 'neutral' && (
                    <span className={data.ai.sentiment === 'negative' ? 'text-danger' : ''}>
                      {MOOD_LABELS[data.ai.sentiment]}
                    </span>
                  )}
                </p>
                <p className="mt-1 break-words">{data.ai.summary}</p>
                {data.ai.suggestedAction && (
                  <p className="mt-1 break-words text-text-muted">
                    Next: {data.ai.suggestedAction}
                  </p>
                )}
              </div>
            ) : (
              can('ai_insights', 'view') && (
                <button
                  type="button"
                  className={smallButton}
                  disabled={classify.isPending}
                  onClick={() => classify.mutate()}
                >
                  <Sparkles size={12} aria-hidden="true" />
                  {classify.isPending ? 'Reading…' : 'Let AI read this conversation'}
                </button>
              )
            )}
            <FormError message={classify.error?.message} />
            {can('ai_insights', 'view') && <ThreadAiTools threadId={data.id} />}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ol aria-label="Messages" className="space-y-2 p-3">
              {data.messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isOpen={openIds.has(message.id)}
                  onToggle={() => toggle(message.id)}
                />
              ))}
            </ol>

            {data.permissions.canReply && can('email', 'create') ? (
              <div className="border-t border-border p-3">
                <MailComposer key={data.id} thread={data} rows={4} onSent={() => setChosen(null)} />
              </div>
            ) : (
              <p className="border-t border-border p-3 text-sm text-text-muted">
                This conversation is in {data.owner?.name ?? 'another person'}’s mailbox. Only they
                can answer in it.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
