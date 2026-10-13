import { useState } from 'react';
import { ArrowLeft, CalendarClock, Eye, Layers, Pause, Play, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import {
  FormError,
  compactInputClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useRecipients, useSending, useSendingActions } from '../api.js';

export const SENDING_STATUS = {
  draft: 'Draft (not started)',
  scheduled: 'Planned for later',
  running: 'Sending…',
  paused: 'Paused',
  finished: 'Finished',
  cancelled: 'Cancelled',
};
// The value a "date and time" box shows for a moment, in the time of this device.
const toBoxValue = (date) => {
  const two = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
};
const ROW_STATUS = {
  pending: ['Waiting', 'text-text-muted'],
  sent: ['Sent', 'text-success'],
  failed: ['Not sent', 'text-danger'],
  skipped: ['Skipped', 'text-text-muted'],
};
const ACTION_WORDS = {
  new: 'A first mail',
  reminder: 'A reminder in the earlier conversation',
  template: 'A WhatsApp template',
};
const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

function Count({ label, value, tone = '' }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

/**
 * One bulk sending: start, pause, go on or cancel it; how far it is; and its timeline: who got
 * what and when, who was skipped or failed and why. The people who did not get it can be kept
 * as a new bundle.
 * @param {{ sendingId: string, onBack: () => void, onOpenBundle: (id: string) => void }} props
 */
export default function SendingDetail({ sendingId, onBack, onOpenBundle }) {
  const can = useCan();
  const sending = useSending(sendingId);
  const actions = useSendingActions();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState(null);
  const [dialog, setDialog] = useState(null); // 'cancel' | 'keep' | 'preview' | 'later'
  const [startAt, setStartAt] = useState('');
  const [bundleName, setBundleName] = useState('');
  const data = sending.data;
  const recipients = useRecipients(sendingId, { status, page }, data?.status === 'running');
  const rows = recipients.data?.data ?? [];
  const counts = data?.counts;
  const notReached = counts ? counts.failed + counts.skipped + counts.pending : 0;
  const canRun = data?.permissions.canRun;
  const preview = actions.preview.data?.data;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All sendings
      </button>
      <FormError
        message={
          sending.error?.status === 404
            ? 'This sending does not exist, or it is not one of yours.'
            : sending.error?.message
        }
      />
      {sending.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold break-words">{data.name}</h2>
              <p className="text-sm text-text-muted">
                {data.channel === 'email' ? 'Mail' : 'WhatsApp'} · to “{data.bundleName}” · from{' '}
                {data.sender ?? 'unknown'} · {data.gapSeconds} seconds between one and the next
              </p>
              <p className="mt-1 text-sm">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${data.status === 'running' ? 'border-brand text-brand-text' : 'border-border'}`}
                >
                  {SENDING_STATUS[data.status]}
                </span>
                {data.pauseReason && <span className="ml-2 text-danger">{data.pauseReason}</span>}
                {data.scheduledAt && (
                  <span className="ml-2">
                    Starts by itself on {formatMoment(data.scheduledAt)}.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.status === 'draft' && data.channel === 'email' && canRun && (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={actions.preview.isPending}
                  onClick={() =>
                    actions.preview.mutate(data.id, { onSuccess: () => setDialog('preview') })
                  }
                >
                  <Eye size={16} aria-hidden="true" />
                  {actions.preview.isPending ? 'Looking…' : 'Look before sending'}
                </button>
              )}
              {['draft', 'scheduled'].includes(data.status) && canRun && (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    actions.start.reset();
                    // Offered: the planned moment, or tomorrow at nine.
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    setStartAt(
                      toBoxValue(data.scheduledAt ? new Date(data.scheduledAt) : tomorrow),
                    );
                    setDialog('later');
                  }}
                >
                  <CalendarClock size={16} aria-hidden="true" />
                  {data.status === 'draft' ? 'Start later' : 'Change the time'}
                </button>
              )}
              {data.status === 'scheduled' && can('campaigns', 'edit') && (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={actions.stop.isPending}
                  onClick={() => actions.stop.mutate({ id: data.id, action: 'unschedule' })}
                >
                  Take the plan off
                </button>
              )}
              {['draft', 'scheduled', 'paused'].includes(data.status) && canRun && (
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={actions.start.isPending}
                  onClick={() => actions.start.mutate({ id: data.id })}
                >
                  <Play size={16} aria-hidden="true" />
                  {data.status === 'draft'
                    ? 'Start sending'
                    : data.status === 'scheduled'
                      ? 'Start now'
                      : 'Go on'}
                </button>
              )}
              {data.status === 'running' && can('campaigns', 'edit') && (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={actions.stop.isPending}
                  onClick={() => actions.stop.mutate({ id: data.id, action: 'pause' })}
                >
                  <Pause size={16} aria-hidden="true" />
                  Pause
                </button>
              )}
              {['draft', 'scheduled', 'running', 'paused'].includes(data.status) &&
                can('campaigns', 'edit') && (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      actions.stop.reset();
                      setDialog('cancel');
                    }}
                  >
                    <Square size={16} aria-hidden="true" />
                    Cancel it
                  </button>
                )}
            </div>
          </div>
          {!canRun && ['draft', 'paused'].includes(data.status) && (
            <p className="text-sm text-text-muted">
              Only {data.sender ?? 'its maker'} can start it: it goes out in their name.
            </p>
          )}
          <FormError
            message={
              actions.start.error?.message ??
              actions.stop.error?.message ??
              actions.preview.error?.message
            }
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Count label="In all" value={counts.total} />
            <Count label="Sent" value={counts.sent} tone="text-success" />
            <Count label="Not sent (error)" value={counts.failed} tone="text-danger" />
            <Count label="Skipped" value={counts.skipped} />
            <Count label="Still waiting" value={counts.pending} />
          </div>

          <details className="rounded-lg border border-border bg-surface p-3 text-sm">
            <summary className="cursor-pointer font-medium">What is sent</summary>
            <div className="mt-2 space-y-1 break-words whitespace-pre-line">
              {data.channel === 'email' ? (
                <>
                  <p>
                    {data.writeMode === 'ai'
                      ? 'The AI writes each mail for its reader.'
                      : 'The same text for everyone.'}{' '}
                    A reminder goes only after {data.minDaysBeforeReminder} days without an answer.
                  </p>
                  {data.brief && <p>About: {data.brief}</p>}
                  {data.subject && <p>Subject: {data.subject}</p>}
                  {data.body && <p>{data.body}</p>}
                  {data.attachments.length > 0 && (
                    <p>Files: {data.attachments.map((file) => file.filename).join(', ')}</p>
                  )}
                </>
              ) : (
                <p>
                  Template “{data.templateName}” ({data.templateLanguage})
                  {data.templateParams.length > 0 && `: ${data.templateParams.join(' | ')}`}
                </p>
              )}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-semibold">Timeline: who got what</h3>
            <select
              aria-label="Show"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={compactInputClass}
            >
              <option value="">Everyone</option>
              <option value="sent">Sent</option>
              <option value="failed">Not sent (error)</option>
              <option value="skipped">Skipped</option>
              <option value="pending">Still waiting</option>
            </select>
            {notReached > 0 && data.status !== 'running' && can('campaigns', 'create') && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  actions.keepUnsent.reset();
                  setBundleName(`${data.name}: not reached`);
                  setDialog('keep');
                }}
              >
                <Layers size={16} aria-hidden="true" />
                Keep the {notReached} not reached as a new bundle
              </button>
            )}
          </div>
          <FormError message={recipients.error?.message} />
          <ol
            aria-label="Timeline"
            className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden"
          >
            {rows.map((row) => {
              const [words, tone] = ROW_STATUS[row.status];
              const isOpen = openRow === row.id;
              return (
                <li key={row.id} className="px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className={`w-20 shrink-0 font-medium ${tone}`}>{words}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{row.name}</span>
                      {row.company && row.company !== row.name && (
                        <>
                          {' · '}
                          {row.accountId ? (
                            <Link
                              to={`/accounts/${row.accountId}`}
                              className="hover:text-brand-text hover:underline"
                            >
                              {row.company}
                            </Link>
                          ) : (
                            row.company
                          )}
                        </>
                      )}
                      <span className="text-text-muted">
                        {' '}
                        · {row.email ?? row.phone ?? 'no address'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {row.processedAt ? formatMoment(row.processedAt) : 'not yet'}
                    </span>
                  </div>
                  {(row.action || row.reason) && (
                    <p className="pl-0 text-xs break-words text-text-muted sm:pl-23">
                      {row.reason ?? ACTION_WORDS[row.action]}
                      {row.body && (
                        <button
                          type="button"
                          className="ml-2 text-brand-text hover:underline"
                          aria-expanded={isOpen}
                          onClick={() => setOpenRow(isOpen ? null : row.id)}
                        >
                          {isOpen ? 'Hide the text' : 'Show the text'}
                        </button>
                      )}
                      {row.threadId && (
                        <Link
                          to={`/inbox?thread=${row.threadId}`}
                          className="ml-2 text-brand-text hover:underline"
                        >
                          Open the conversation
                        </Link>
                      )}
                    </p>
                  )}
                  {isOpen && (
                    <div className="mt-1 rounded-md border border-border bg-page p-2 text-xs break-words whitespace-pre-wrap">
                      {row.subject && <p className="font-medium">Subject: {row.subject}</p>}
                      {row.body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <Pagination
            meta={recipients.data?.meta}
            noun={['person', 'people']}
            onPageChange={setPage}
          />
        </>
      )}

      {dialog === 'later' && (
        <Dialog open title="Start this sending later" onClose={() => setDialog(null)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              actions.start.mutate(
                { id: sendingId, at: new Date(startAt).toISOString() },
                { onSuccess: () => setDialog(null) },
              );
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Day and time</span>
              <input
                type="datetime-local"
                required
                value={startAt}
                min={toBoxValue(new Date())}
                onChange={(event) => setStartAt(event.target.value)}
                className={inputClass}
              />
            </label>
            <p className="text-sm text-text-muted">
              It starts by itself at that moment, within a minute, also when nobody is signed in.
              Who is skipped is decided then, not now. If your Gmail is not connected at that
              moment, it waits and you are told.
            </p>
            <FormError message={actions.start.error?.message} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setDialog(null)}
              >
                Not now
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={!startAt || actions.start.isPending}
              >
                Plan it
              </button>
            </div>
          </form>
        </Dialog>
      )}

      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Cancel this sending?"
        confirmLabel="Cancel the sending"
        isBusy={actions.stop.isPending}
        error={actions.stop.error?.message}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          actions.stop.mutate(
            { id: sendingId, action: 'cancel' },
            { onSuccess: () => setDialog(null) },
          )
        }
      >
        <p>
          The people still waiting will not get the message. What was sent stays sent. To stop only
          for a while, use Pause.
        </p>
      </ConfirmDialog>

      {dialog === 'keep' && (
        <Dialog
          open
          title="Keep the people not reached as a new bundle"
          onClose={() => setDialog(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              actions.keepUnsent.mutate(
                { id: sendingId, name: bundleName.trim() },
                { onSuccess: (payload) => onOpenBundle(payload.data.id) },
              );
            }}
          >
            <p className="text-sm text-text-muted">
              Everyone who failed, was skipped, or was never reached goes into it, so you can write
              to them another time.
            </p>
            <input
              aria-label="Name of the new bundle"
              autoFocus
              maxLength={120}
              value={bundleName}
              onChange={(event) => setBundleName(event.target.value)}
              className={inputClass}
            />
            <FormError message={actions.keepUnsent.error?.message} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={!bundleName.trim() || actions.keepUnsent.isPending}
              >
                {actions.keepUnsent.isPending ? 'Saving…' : 'Save the bundle'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {dialog === 'preview' && preview && (
        <Dialog open wide title="Before sending" onClose={() => setDialog(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-text-muted">
              What would happen for the first people in line. Nothing was sent.
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {preview.plan.map((item) => (
                <li key={item.email} className="px-3 py-1.5">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-text-muted"> · {item.company}</span>
                  <span className="block text-xs text-text-muted">
                    {item.will === 'skip'
                      ? `Skipped. ${item.reason}`
                      : item.will === 'reminder'
                        ? 'Gets a reminder inside the earlier conversation.'
                        : 'Gets a first mail.'}
                  </span>
                </li>
              ))}
            </ul>
            {preview.sample ? (
              <div className="rounded-md border border-border bg-page p-2">
                <p className="mb-1 text-xs text-text-muted">
                  The mail for {preview.sample.to} (
                  {preview.sample.action === 'reminder' ? 'a reminder' : 'a first mail'}), as it
                  would go out:
                </p>
                <p className="font-medium">Subject: {preview.sample.subject}</p>
                <p className="break-words whitespace-pre-wrap">{preview.sample.body}</p>
              </div>
            ) : (
              <p>None of the first people would get a mail.</p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
