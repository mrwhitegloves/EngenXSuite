import { useState } from 'react';
import { ArrowLeft, Inbox, Paperclip, PenSquare, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useMailActions, useMailbox, useThread, useThreads } from '../api.js';

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting for us' },
  { id: 'mine', label: 'My mailbox' },
];
const CATEGORY_LABELS = {
  enquiry: 'Enquiry',
  quotation_request: 'Asks for a quote',
  follow_up: 'Follow-up',
  meeting_request: 'Meeting',
  complaint: 'Complaint',
  information: 'Information',
  other: 'Other',
};
const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
const whoOf = (thread) => thread.contact?.name ?? thread.participants[0] ?? 'Unknown';

// A new mail from my own mailbox. It is kept in the CRM when it goes to a person who is in it.
function ComposeDialog({ onClose }) {
  const { send } = useMailActions();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const recipients = to
    .split(/[,;\s]+/)
    .map((address) => address.trim())
    .filter(Boolean);
  return (
    <Dialog
      open
      wide
      title="New mail"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={send.isPending || recipients.length === 0 || !subject.trim() || !text.trim()}
            onClick={() =>
              send.mutate({ to: recipients, subject: subject.trim(), text }, { onSuccess: onClose })
            }
          >
            <Send size={16} aria-hidden="true" />
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">To</span>
          <input
            type="text"
            value={to}
            placeholder="name@company.com (a comma between several)"
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Subject</span>
          <input
            type="text"
            maxLength={300}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Message</span>
          <textarea
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className={inputClass}
          />
        </label>
        <p className="text-xs text-text-muted">
          It goes out from your own Gmail. It is kept here when it goes to a person who is in the
          CRM.
        </p>
        <FormError message={send.error?.message} />
      </div>
    </Dialog>
  );
}

// The answer box of a conversation of my own mailbox, with the AI's draft.
function ReplyBox({ thread }) {
  const { send, draft } = useMailActions(thread.id);
  const [text, setText] = useState('');
  const [instruction, setInstruction] = useState('');
  return (
    <form
      className="space-y-2 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        send.mutate({ threadId: thread.id, text }, { onSuccess: () => setText('') });
      }}
    >
      <textarea
        aria-label="Your answer"
        rows={5}
        placeholder={`Answer ${whoOf(thread)}…`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          aria-label="How the AI should write the draft"
          placeholder="Optional: how the draft should be (short, ask for a call…)"
          maxLength={1000}
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          className={`${compactInputClass} min-w-0 flex-1 text-sm`}
        />
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={draft.isPending}
          onClick={() =>
            draft.mutate(instruction.trim() ? { instruction: instruction.trim() } : undefined, {
              onSuccess: (payload) => setText(payload.data.body),
            })
          }
        >
          <Sparkles size={16} aria-hidden="true" />
          {draft.isPending ? 'Writing…' : 'Draft with AI'}
        </button>
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={send.isPending || !text.trim()}
        >
          <Send size={16} aria-hidden="true" />
          {send.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {draft.isSuccess && (
        <p className="text-xs text-text-muted">
          Written by AI. Read it, fill in anything in [square brackets], change what is wrong, then
          send. Nothing is sent by itself.
        </p>
      )}
      <FormError message={send.error?.message ?? draft.error?.message} />
    </form>
  );
}

// One conversation: who it is with, the AI's reading, the messages, and the answer box.
function ThreadView({ threadId, onBack }) {
  const thread = useThread(threadId);
  const { classify } = useMailActions(threadId);
  const can = useCan();
  const data = thread.data;

  return (
    <section
      aria-label="Conversation"
      className="flex min-h-0 flex-col rounded-lg border border-border bg-surface"
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
            <h2 className="font-semibold break-words">{data.subject}</h2>
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
          </header>

          <ol aria-label="Messages" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {data.messages.map((message) => (
              <li
                key={message.id}
                className={`rounded-lg border p-3 text-sm ${message.direction === 'outbound' ? 'border-brand bg-brand-soft' : 'border-border bg-page'}`}
              >
                <p className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-text-muted">
                  <span className="font-medium text-text">
                    {message.direction === 'outbound'
                      ? 'We wrote'
                      : (message.fromName ?? message.from)}
                  </span>
                  <span>{formatMoment(message.sentAt)}</span>
                </p>
                <p className="break-words whitespace-pre-wrap">{message.text || '(no text)'}</p>
                {message.attachments.map((file) => (
                  <p
                    key={file.filename}
                    className="mt-1 flex items-center gap-1 text-xs text-text-muted"
                  >
                    <Paperclip size={11} aria-hidden="true" />
                    {file.filename} (open it in Gmail)
                  </p>
                ))}
              </li>
            ))}
          </ol>

          {data.permissions.canReply && can('email', 'create') ? (
            <ReplyBox key={data.id} thread={data} />
          ) : (
            <p className="border-t border-border p-3 text-sm text-text-muted">
              This conversation is in {data.owner?.name ?? 'another person'}’s mailbox. Only they
              can answer in it.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// The Inbox: customer mail of the connected mailboxes. A person sees their own conversations;
// a manager and the CEO also see their team's conversations that belong to a company.
export default function InboxPage() {
  const can = useCan();
  const list = useListParams(['view', 'search', 'thread']);
  const [isComposing, setIsComposing] = useState(false);
  const view = VIEWS.find((item) => item.id === list.values.view) ?? VIEWS[0];
  const { search, thread: openId } = list.values;
  const mailbox = useMailbox();
  const { sync } = useMailActions();
  const threads = useThreads({ view: view.id, search, page: list.page });
  const rows = threads.data?.data ?? [];
  const open = (id) => list.setFilters({ thread: id });

  return (
    <>
      <PageHeader title="Inbox" description="Mail of your customers, from the connected mailboxes.">
        {mailbox.data?.isConnected && (
          <>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={sync.isPending ? 'animate-spin' : ''}
              />
              Read my mailbox now
            </button>
            {can('email', 'create') && (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => setIsComposing(true)}
              >
                <PenSquare size={16} aria-hidden="true" />
                New mail
              </button>
            )}
          </>
        )}
      </PageHeader>

      {mailbox.data && !mailbox.data.isConnected && (
        <p className="mb-4 rounded-md border border-border bg-surface p-3 text-sm">
          {mailbox.data.needsReconnect
            ? 'Google no longer allows access to your mailbox. '
            : 'Your own Gmail is not connected, so your customer mail is not shown here. '}
          <Link to="/connections" className="text-brand-text hover:underline">
            Open “Mail and calendar” to connect it
          </Link>
          .
        </p>
      )}
      {mailbox.data?.isConnected && (
        <p className="mb-3 text-xs text-text-muted">
          {mailbox.data.googleEmail} ·{' '}
          {mailbox.data.lastSyncAt
            ? `last read ${formatMoment(mailbox.data.lastSyncAt)}`
            : 'not read yet: press “Read my mailbox now”'}
          . Only mail with people who are in the CRM is kept.
          {sync.isSuccess && ' Reading now; new mail shows in a few seconds.'}
        </p>
      )}
      <FormError
        message={sync.error?.message ?? mailbox.data?.lastError ?? threads.error?.message}
      />

      <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-15rem)] lg:grid-cols-[22rem_1fr]">
        <section
          aria-label="Conversations"
          className={`flex min-h-0 flex-col gap-2 ${openId ? 'max-lg:hidden' : ''}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Show"
              value={view.id}
              onChange={(event) =>
                list.setFilters({ view: event.target.value === 'all' ? '' : event.target.value })
              }
              className={compactInputClass}
            >
              {VIEWS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              type="search"
              aria-label="Search mail"
              placeholder="Search subject or address"
              defaultValue={search}
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  list.setFilters({ search: event.currentTarget.value.trim() });
              }}
              className={`${compactInputClass} min-w-0 flex-1`}
            />
          </div>
          {threads.isPending && (
            <p role="status" className="text-text-muted">
              Loading…
            </p>
          )}
          {threads.isSuccess && rows.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={
                search || view.id !== 'all' ? 'No conversation matches' : 'No customer mail yet'
              }
              description="Mail shows here when a person who is in the CRM writes to a connected mailbox, or is written to."
            />
          )}
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface empty:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-current={row.id === openId ? 'true' : undefined}
                  onClick={() => open(row.id)}
                  className={`block w-full px-3 py-2 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-brand ${row.id === openId ? 'bg-page' : ''}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate ${row.isWaitingForUs ? 'font-semibold' : 'font-medium'}`}
                    >
                      {whoOf(row)}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatMoment(row.lastMessageAt)}
                    </span>
                  </span>
                  <span className="block truncate text-sm">{row.subject}</span>
                  <span className="block truncate text-xs text-text-muted">{row.snippet}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {row.account && (
                      <span className="rounded-full border border-border px-1.5">
                        {row.account.name}
                      </span>
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
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            meta={threads.data?.meta}
            noun={['conversation', 'conversations']}
            onPageChange={list.setPage}
          />
        </section>

        {openId ? (
          <ThreadView key={openId} threadId={openId} onBack={() => open('')} />
        ) : (
          <p className="hidden rounded-lg border border-dashed border-border bg-surface p-6 text-text-muted lg:block">
            Choose a conversation on the left.
          </p>
        )}
      </div>

      {isComposing && <ComposeDialog onClose={() => setIsComposing(false)} />}
    </>
  );
}
