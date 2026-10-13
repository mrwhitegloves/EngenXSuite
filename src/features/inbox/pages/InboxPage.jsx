import { useState } from 'react';
import { Inbox, PenSquare, RefreshCw, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useMailActions, useMailbox, useThreads } from '../api.js';
import ComposeDialog from '../components/ComposeDialog.jsx';
import { BringInDialog } from '../components/MailLinks.jsx';
import ThreadList from '../components/ThreadList.jsx';
import ThreadView from '../components/ThreadView.jsx';
import { formatMoment } from '../mailFormat.js';

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting for us' },
  { id: 'mine', label: 'My mailbox' },
  { id: 'follow_up', label: 'Follow-up due (no answer for 3 days)' },
];

// The Inbox: customer mail of the connected mailboxes. A person sees their own conversations;
// a manager and the CEO also see their team's conversations that belong to a company.
export default function InboxPage() {
  const can = useCan();
  const list = useListParams(['view', 'search', 'thread']);
  // null: closed. Otherwise the company and the address a new mail starts with.
  const [composing, setComposing] = useState(null);
  const [isBringingIn, setIsBringingIn] = useState(false);
  const navigate = useNavigate();
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
            {can('email', 'create') && can('accounts', 'create') && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setIsBringingIn(true)}
              >
                <UserPlus size={16} aria-hidden="true" />
                Add a new sender
              </button>
            )}
            {can('email', 'create') && (
              <button type="button" className={primaryButtonClass} onClick={() => setComposing({})}>
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

      <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-15rem)] lg:grid-cols-[22rem_minmax(0,1fr)]">
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
          <ThreadList rows={rows} openId={openId} onOpen={open} />
          <Pagination
            meta={threads.data?.meta}
            noun={['conversation', 'conversations']}
            onPageChange={list.setPage}
          />
        </section>

        {openId ? (
          <ThreadView
            key={openId}
            threadId={openId}
            onBack={() => open('')}
            onNewConversation={(thread) =>
              setComposing({
                account: thread.account ?? undefined,
                initialTo: thread.participants[0] ?? '',
              })
            }
          />
        ) : (
          <p className="hidden rounded-lg border border-dashed border-border bg-surface p-6 text-text-muted lg:block">
            Choose a conversation on the left.
          </p>
        )}
      </div>

      {isBringingIn && (
        <BringInDialog
          onClose={() => setIsBringingIn(false)}
          onDone={(accountId) => navigate(`/accounts/${accountId}?tab=mail`)}
        />
      )}
      {composing && (
        <ComposeDialog
          account={composing.account}
          initialTo={composing.initialTo}
          onClose={() => setComposing(null)}
        />
      )}
    </>
  );
}
