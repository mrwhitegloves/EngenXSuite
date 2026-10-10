import { useState } from 'react';
import {
  CalendarDays,
  FileText,
  ListChecks,
  Mail,
  MessageCircle,
  Mic,
  Pencil,
  Phone,
  Settings2,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useNoteActions, useTimeline } from '../api.js';

// The filters of every timeline (Master Prompt Section 13). Calls, email, WhatsApp, meetings
// and documents fill up when those parts are built.
const FILTERS = [
  { type: '', label: 'All' },
  { type: 'NOTE', label: 'Notes' },
  { type: 'TASK', label: 'Tasks' },
  { type: 'CALL', label: 'Calls' },
  { type: 'EMAIL', label: 'Email' },
  { type: 'WHATSAPP', label: 'WhatsApp' },
  { type: 'MEETING', label: 'Meetings' },
  { type: 'DOCUMENT', label: 'Documents' },
];
const ICONS = {
  NOTE: StickyNote,
  TASK: ListChecks,
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  MEETING: CalendarDays,
  DOCUMENT: FileText,
  VOICE_NOTE: Mic,
  SYSTEM: Settings2,
};
const PAGE_SIZE = 20;
const MAX_NOTE = 5000;

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

// One entry. A note shows its text and, for its writer, Edit and Delete.
function Entry({ entry, showLead, notes, onDelete }) {
  const [draft, setDraft] = useState(null); // null = not being edited
  const Icon = ICONS[entry.type] ?? Settings2;
  const isNote = entry.type === 'NOTE';

  return (
    <li className="flex gap-3 px-3 py-2.5">
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border ${isNote ? 'text-brand-text' : 'text-text-muted'}`}
      >
        <Icon size={14} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{isNote ? (entry.user?.name ?? 'Note') : entry.title}</span>
          <span className="text-xs text-text-muted">
            {formatMoment(entry.occurredAt)}
            {!isNote && entry.user && <> · {entry.user.name}</>}
            {entry.editedAt && ' · edited'}
          </span>
        </p>
        {showLead && entry.lead && (
          <p className="text-xs text-text-muted">
            Lead:{' '}
            <Link
              to={`/pipeline/${entry.lead.id}`}
              className="hover:text-brand-text hover:underline"
            >
              {entry.lead.name}
            </Link>
          </p>
        )}
        {entry.contact && <p className="text-xs text-text-muted">About {entry.contact.name}</p>}

        {draft === null ? (
          entry.content && <p className="mt-1 break-words whitespace-pre-line">{entry.content}</p>
        ) : (
          <form
            className="mt-1 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              notes.update.mutate(
                { id: entry.id, content: draft.trim() },
                { onSuccess: () => setDraft(null) },
              );
            }}
          >
            <textarea
              aria-label="Note text"
              rows={3}
              maxLength={MAX_NOTE}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={inputClass}
            />
            <FormError message={notes.update.error?.message} />
            <div className="flex gap-2">
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={!draft.trim() || notes.update.isPending}
              >
                {notes.update.isPending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {entry.canEdit && draft === null && (
          <p className="mt-1 flex gap-3 text-xs">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-text-muted hover:text-text"
              onClick={() => {
                notes.update.reset();
                setDraft(entry.content ?? '');
              }}
            >
              <Pencil size={12} aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-text-muted hover:text-danger"
              onClick={() => onDelete(entry)}
            >
              <Trash2 size={12} aria-hidden="true" />
              Delete
            </button>
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * THE timeline: everything that happened on one company, lead or contact, newest first, with
 * a box to write a note. Used on every page that shows a history.
 *
 * @param {{ target: { accountId?: string, opportunityId?: string, contactId?: string },
 *           canWrite?: boolean, showLead?: boolean }} props
 *        target: exactly one id. canWrite: the person may edit that record, so may write notes.
 *        showLead: on a company's timeline, say which lead an entry is about.
 */
export default function Timeline({ target, canWrite = false, showLead = false }) {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const timeline = useTimeline(target, { type, page, pageSize: PAGE_SIZE });
  const notes = useNoteActions();
  const rows = timeline.data?.data ?? [];

  function addNote(event) {
    event.preventDefault();
    notes.create.mutate(
      { ...target, content: note.trim() },
      {
        onSuccess: () => {
          setNote('');
          setPage(1);
        },
      },
    );
  }

  return (
    <section aria-label="Timeline" className="space-y-3">
      {canWrite && (
        <form onSubmit={addNote} className="space-y-2">
          <textarea
            aria-label="New note"
            rows={2}
            maxLength={MAX_NOTE}
            placeholder="Write a note: what was said, what was agreed, what comes next…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
          <FormError message={notes.create.error?.message} />
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!note.trim() || notes.create.isPending}
          >
            {notes.create.isPending ? 'Adding…' : 'Add note'}
          </button>
        </form>
      )}

      <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const isCurrent = filter.type === type;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={isCurrent}
              onClick={() => {
                setType(filter.type);
                setPage(1);
              }}
              className={[
                'rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-brand',
                isCurrent
                  ? 'border-brand bg-brand-soft font-medium text-brand-text'
                  : 'border-border bg-surface text-text-muted hover:border-text-muted',
              ].join(' ')}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <FormError message={timeline.error?.message} />
      {timeline.isPending && (
        <p role="status" className="text-text-muted">
          Loading the timeline…
        </p>
      )}
      {timeline.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          {type ? 'Nothing of this kind yet.' : 'Nothing has happened here yet.'}
        </p>
      )}
      {rows.length > 0 && (
        <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((entry) => (
            <Entry
              key={entry.id}
              entry={entry}
              showLead={showLead}
              notes={notes}
              onDelete={(item) => {
                notes.remove.reset();
                setDeleteTarget(item);
              }}
            />
          ))}
        </ol>
      )}
      <Pagination meta={timeline.data?.meta} noun={['entry', 'entries']} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this note?"
        confirmLabel="Delete"
        isBusy={notes.remove.isPending}
        error={notes.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          notes.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p className="break-words whitespace-pre-line">“{deleteTarget?.content}”</p>
      </ConfirmDialog>
    </section>
  );
}
