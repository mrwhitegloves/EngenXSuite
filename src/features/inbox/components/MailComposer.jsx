import { useRef, useState } from 'react';
import { FolderOpen, Paperclip, Send, X } from 'lucide-react';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useAccountFiles, useMailActions, useSignature } from '../api.js';
import { addressesOf, formatMoment, formatSize, smallButton } from '../mailFormat.js';
import AiMailWriter from './AiMailWriter.jsx';

const MAX_FILES = 10;

// The files of the company's earlier mail, to send one of them again.
function CompanyFiles({ accountId, chosen, onAdd }) {
  const files = useAccountFiles(accountId);
  const rows = (files.data ?? []).filter((file) => !chosen.some((item) => item.url === file.url));
  return (
    <div className="rounded-md border border-border p-2 text-sm">
      {files.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      <FormError message={files.error?.message} />
      {files.isSuccess && rows.length === 0 && (
        <p className="text-text-muted">
          No file from this company’s mail to add. A file shows here once it came or went with a
          mail.
        </p>
      )}
      <ul className="max-h-48 divide-y divide-border overflow-y-auto">
        {rows.map((file) => (
          <li key={file.url} className="flex items-center justify-between gap-2 py-1">
            <span className="min-w-0">
              <span className="block truncate">{file.filename}</span>
              <span className="block truncate text-xs text-text-muted">
                {file.direction === 'inbound' ? 'Received' : 'Sent'} {formatMoment(file.sentAt)} ·{' '}
                {formatSize(file.size)} · {file.subject}
              </span>
            </span>
            <button type="button" className={smallButton} onClick={() => onAdd(file)}>
              Attach
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Where a mail is written: an answer inside a conversation, or a new mail. With files from the
 * device or from the company's earlier mail, and the AI's help. It always goes out from the
 * person's own Gmail.
 *
 * @param {{ thread?: object, account?: { id: string, name: string }, contacts?: object[],
 *           initialTo?: string, rows?: number, onSent?: () => void }} props
 *        thread: answer inside this conversation (To and Subject are then fixed by it)
 *        account + contacts: the company the new mail is for (its people, its files, AI)
 */
export default function MailComposer({
  thread,
  account,
  contacts = [],
  initialTo = '',
  rows = 6,
  onSent,
}) {
  const { send, upload } = useMailActions(thread?.id);
  const picker = useRef(null);
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [isChoosing, setIsChoosing] = useState(false);
  const signature = useSignature().data;
  const [problem, setProblem] = useState('');

  const accountId = thread?.account?.id ?? account?.id;
  const recipients = addressesOf(to);
  const withEmail = contacts.filter((contact) => contact.email);
  const contactId = withEmail.find((contact) => recipients.includes(contact.email))?.id;
  const isReady = thread
    ? Boolean(text.trim())
    : recipients.length > 0 && subject.trim() && text.trim();

  const addFile = (file) => {
    setProblem('');
    if (files.length >= MAX_FILES) return setProblem(`A mail takes up to ${MAX_FILES} files.`);
    return setFiles((list) => [...list, file]);
  };
  const pickFromDevice = (event) => {
    const picked = [...event.target.files];
    event.target.value = '';
    setProblem('');
    for (const file of picked) {
      upload.mutate(file, { onSuccess: (payload) => addFile(payload.data) });
    }
  };
  const submit = (event) => {
    event.preventDefault();
    const attachments = files.map(({ url, filename, mimeType }) => ({ url, filename, mimeType }));
    send.mutate(
      {
        ...(thread ? { threadId: thread.id } : { to: recipients, subject: subject.trim() }),
        text,
        ...(attachments.length ? { attachments } : {}),
      },
      {
        onSuccess: () => {
          setText('');
          setFiles([]);
          onSent?.();
        },
      },
    );
  };

  return (
    <form className="space-y-2" onSubmit={submit}>
      {!thread && (
        <>
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
          {withEmail.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
              People of {account?.name ?? 'the company'}:
              {withEmail.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={smallButton}
                  disabled={recipients.includes(contact.email)}
                  onClick={() => setTo([...recipients, contact.email].join(', '))}
                >
                  {contact.name}
                </button>
              ))}
            </p>
          )}
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
        </>
      )}
      <textarea
        aria-label={thread ? 'Your answer' : 'Message'}
        rows={rows}
        placeholder={thread ? 'Write in this conversation…' : 'Write the mail…'}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={inputClass}
      />

      {(thread || accountId) && (
        <AiMailWriter
          thread={thread}
          accountId={accountId}
          contactId={contactId}
          draft={{ subject: thread ? thread.subject : subject, body: text }}
          onDraft={(draft) => {
            setText(draft.body);
            if (!thread) setSubject(draft.subject);
          }}
        />
      )}

      {files.length > 0 && (
        <ul aria-label="Files of this mail" className="flex flex-wrap gap-1.5">
          {files.map((file) => (
            <li
              key={file.url}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
            >
              <Paperclip size={11} aria-hidden="true" />
              <span className="truncate">{file.filename}</span>
              <span className="shrink-0 text-text-muted">{formatSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.filename}`}
                className="rounded text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
                onClick={() => setFiles((list) => list.filter((item) => item.url !== file.url))}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {isChoosing && accountId && (
        <CompanyFiles accountId={accountId} chosen={files} onAdd={addFile} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          aria-label="Files from your device"
          onChange={pickFromDevice}
        />
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={upload.isPending}
          onClick={() => picker.current.click()}
        >
          <Paperclip size={16} aria-hidden="true" />
          {upload.isPending ? 'Uploading…' : 'Attach a file'}
        </button>
        {signature && !text.includes(signature) && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setText(`${text.trimEnd()}\n\n${signature}`.trimStart())}
          >
            Add my signature
          </button>
        )}
        {accountId && (
          <button
            type="button"
            className={secondaryButtonClass}
            aria-expanded={isChoosing}
            onClick={() => setIsChoosing((value) => !value)}
          >
            <FolderOpen size={16} aria-hidden="true" />
            From the company’s files
          </button>
        )}
        <button
          type="submit"
          className={`${primaryButtonClass} ml-auto`}
          disabled={send.isPending || upload.isPending || !isReady}
        >
          <Send size={16} aria-hidden="true" />
          {send.isPending ? 'Sending…' : thread ? 'Send in this conversation' : 'Send'}
        </button>
      </div>
      {!thread && (
        <p className="text-xs text-text-muted">
          It goes out from your own Gmail as a new conversation. It is kept here when it goes to a
          person who is in the CRM.
        </p>
      )}
      <FormError message={problem || upload.error?.message || send.error?.message} />
    </form>
  );
}
