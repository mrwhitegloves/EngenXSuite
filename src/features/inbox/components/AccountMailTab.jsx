import { useState } from 'react';
import { Mail, Paperclip, PenSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  primaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useAccountContacts } from '../../accounts/api.js';
import { useAccountFiles, useMailbox, useThreads } from '../api.js';
import { formatMoment, formatSize } from '../mailFormat.js';
import ComposeDialog from './ComposeDialog.jsx';
import ThreadList from './ThreadList.jsx';
import ThreadView from './ThreadView.jsx';

// Every file that came or went with this company's mail.
function FilesList({ accountId }) {
  const files = useAccountFiles(accountId);
  return (
    <section aria-label="Files" className="rounded-lg border border-border bg-surface">
      {files.isPending && (
        <p role="status" className="p-3 text-text-muted">
          Loading…
        </p>
      )}
      <FormError message={files.error?.message} />
      {files.isSuccess && files.data.length === 0 && (
        <p className="p-3 text-text-muted">No file came or went with this company’s mail yet.</p>
      )}
      <ul className="divide-y divide-border">
        {(files.data ?? []).map((file) => (
          <li key={file.url}>
            <a
              href={file.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Paperclip size={14} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{file.filename}</span>
                <span className="block truncate text-xs text-text-muted">
                  {file.direction === 'inbound' ? 'Received' : 'Sent'} {formatMoment(file.sentAt)} ·{' '}
                  {file.subject}
                </span>
              </span>
              <span className="shrink-0 text-xs text-text-muted">{formatSize(file.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The "Mail" tab of a company: every conversation with its people, each with all its mails and
 * files; a new mail to the company; and the next mail inside any earlier conversation.
 * @param {{ account: { id: string, name: string } }} props
 */
export default function AccountMailTab({ account }) {
  const can = useCan();
  const mailbox = useMailbox();
  const contacts = useAccountContacts(account.id);
  const [show, setShow] = useState('threads');
  const [contactId, setContactId] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState('');
  // null: closed. Otherwise who the new mail starts with ('' = nobody yet).
  const [composeTo, setComposeTo] = useState(null);
  const threads = useThreads({ accountId: account.id, contactId, page });
  const rows = threads.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Show"
          value={show}
          onChange={(event) => setShow(event.target.value)}
          className={compactInputClass}
        >
          <option value="threads">Conversations</option>
          <option value="files">Files</option>
        </select>
        {show === 'threads' && (
          <select
            aria-label="Person"
            value={contactId}
            onChange={(event) => {
              setContactId(event.target.value);
              setPage(1);
              setOpenId('');
            }}
            className={compactInputClass}
          >
            <option value="">All people</option>
            {(contacts.data ?? []).map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        )}
        {mailbox.data?.isConnected && can('email', 'create') && (
          <button
            type="button"
            className={`${primaryButtonClass} ml-auto`}
            onClick={() =>
              setComposeTo(
                (contacts.data ?? []).find((contact) => contact.id === contactId)?.email ?? '',
              )
            }
          >
            <PenSquare size={16} aria-hidden="true" />
            New mail
          </button>
        )}
      </div>
      {mailbox.data && !mailbox.data.isConnected && (
        <p className="rounded-md border border-border bg-surface p-3 text-sm">
          The company mailbox is not connected, so customer mail cannot be read or sent.
          <Link to="/connections" className="text-brand-text hover:underline">
            Open “Mail and calendar”
          </Link>
          .
        </p>
      )}
      <FormError message={threads.error?.message} />

      {show === 'files' ? (
        <FilesList accountId={account.id} />
      ) : (
        <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-18rem)] lg:min-h-128 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <section
            aria-label="Conversations"
            className={`flex min-h-0 flex-col gap-2 ${openId ? 'max-lg:hidden' : ''}`}
          >
            {threads.isPending && (
              <p role="status" className="text-text-muted">
                Loading…
              </p>
            )}
            {threads.isSuccess && rows.length === 0 && (
              <EmptyState
                icon={Mail}
                title="No mail with this company yet"
                description="A conversation shows here when one of its people writes to a connected mailbox, or is written to."
              />
            )}
            <ThreadList rows={rows} openId={openId} onOpen={setOpenId} showAccount={false} />
            <Pagination
              meta={threads.data?.meta}
              noun={['conversation', 'conversations']}
              onPageChange={setPage}
            />
          </section>
          {openId ? (
            <ThreadView
              key={openId}
              threadId={openId}
              onBack={() => setOpenId('')}
              onNewConversation={(thread) => setComposeTo(thread.participants[0] ?? '')}
            />
          ) : (
            <p className="hidden rounded-lg border border-dashed border-border bg-surface p-6 text-text-muted lg:block">
              Choose a conversation on the left to read it and to write the next mail in it, or
              start a new one with “New mail”.
            </p>
          )}
        </div>
      )}

      {composeTo !== null && (
        <ComposeDialog account={account} initialTo={composeTo} onClose={() => setComposeTo(null)} />
      )}
    </div>
  );
}
