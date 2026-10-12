import { useState } from 'react';
import { FileText, Link2, PhoneIncoming, PhoneOutgoing, Play } from 'lucide-react';
import Pagination from '../../../components/shared/Pagination.jsx';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useCalls, useRecordingLink, useSetOutcome } from '../api.js';
import CallTranscript from './CallTranscript.jsx';
import LinkCallDialog from './LinkCallDialog.jsx';

const PAGE_SIZE = 5;
const STATUS_LABELS = {
  initiated: 'Starting',
  ringing: 'Ringing',
  in_progress: 'Talking now',
  completed: 'Talked',
  missed: 'Missed',
  busy: 'Busy',
  no_answer: 'No answer',
  failed: 'Did not go through',
};
const OUTCOME_LABELS = {
  connected: 'Talked to them',
  no_answer: 'No answer',
  callback_requested: 'Asked to call back',
  not_interested: 'Not interested',
  wrong_number: 'Wrong number',
};
const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const DID_NOT_HAPPEN = ['missed', 'busy', 'no_answer', 'failed'];

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
const formatLength = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// One call: who, when, how it went; what came of it; and its recording.
function CallRow({ call }) {
  const [isLinking, setIsLinking] = useState(false);
  const [showText, setShowText] = useState(false);
  const outcome = useSetOutcome();
  const recording = useRecordingLink();
  const Icon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
  const who = call.contact?.name ?? call.number;

  return (
    <li className="flex gap-3 px-3 py-2.5 text-sm">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-text-muted">
        <Icon size={14} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">
            {call.direction === 'inbound' ? 'From' : 'To'} {who}
          </span>
          <span
            className={DID_NOT_HAPPEN.includes(call.status) ? 'text-danger' : 'text-text-muted'}
          >
            {STATUS_LABELS[call.status] ?? call.status}
            {call.durationSec > 0 && ` · ${formatLength(call.durationSec)}`}
          </span>
        </p>
        <p className="text-xs text-text-muted">
          {formatMoment(call.startedAt)}
          {call.user && <> · {call.user.name}</>}
          {call.answeredBy && <> · picked up by {call.answeredBy.name}</>}
          {call.contact && <> · {call.number}</>}
          {call.cost > 0 && <> · Plivo charge {call.cost.toFixed(2)}</>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {call.permissions.canEdit ? (
            <select
              aria-label={`What came of the call with ${who}`}
              value={call.outcome ?? ''}
              disabled={outcome.isPending}
              onChange={(event) =>
                outcome.mutate({ id: call.id, outcome: event.target.value || null })
              }
              className={`${compactInputClass} py-1 text-xs`}
            >
              <option value="">What came of it?</option>
              {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            call.outcome && <span className="text-xs">{OUTCOME_LABELS[call.outcome]}</span>
          )}
          {call.permissions.canEdit && (
            <button type="button" className={smallButton} onClick={() => setIsLinking(true)}>
              <Link2 size={12} aria-hidden="true" />
              {call.contact ? 'Change the person' : 'Say who it was'}
            </button>
          )}
          {call.permissions.canPlayRecording && (
            <button
              type="button"
              className={smallButton}
              aria-expanded={showText}
              onClick={() => setShowText(!showText)}
            >
              <FileText size={12} aria-hidden="true" />
              {call.hasTranscript ? 'Text of the call' : 'Text and AI summary'}
            </button>
          )}
          {call.permissions.canPlayRecording && !recording.data && (
            <button
              type="button"
              className={smallButton}
              disabled={recording.isPending}
              onClick={() => recording.mutate(call.id)}
            >
              <Play size={12} aria-hidden="true" />
              {recording.isPending ? 'Opening…' : 'Listen to the recording'}
            </button>
          )}
        </div>
        {recording.data && (
          <audio
            controls
            autoPlay
            src={recording.data.data.url}
            aria-label={`Recording of the call with ${who}`}
            className="w-full max-w-sm"
          />
        )}
        {showText && <CallTranscript call={call} who={who} />}
        <FormError message={outcome.error?.message ?? recording.error?.message} />
        {isLinking && <LinkCallDialog call={call} onClose={() => setIsLinking(false)} />}
      </div>
    </li>
  );
}

/**
 * The phone calls of one lead or company, newest first: how each went, what came of it, and
 * its recording for someone who may listen.
 *
 * @param {{ target: { opportunityId?: string, accountId?: string, contactId?: string,
 *           linked?: string }, title?: string, pageSize?: number, empty?: string }} props
 *        target: one record; or no id at all for every call I may see.
 */
export default function RecordCalls({
  target,
  title = 'Calls',
  pageSize = PAGE_SIZE,
  empty = 'No calls yet. Use the Call button next to a phone number.',
}) {
  const [page, setPage] = useState(1);
  const calls = useCalls(target, { page, pageSize });
  const rows = calls.data?.data ?? [];

  return (
    <section aria-label="Calls" className="space-y-2">
      {title && <h2 className="font-semibold">{title}</h2>}
      <FormError message={calls.error?.message} />
      {calls.isPending && (
        <p role="status" className="text-text-muted">
          Loading the calls…
        </p>
      )}
      {calls.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          {empty}
        </p>
      )}
      {rows.length > 0 && (
        <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((call) => (
            <CallRow key={call.id} call={call} />
          ))}
        </ol>
      )}
      <Pagination meta={calls.data?.meta} noun={['call', 'calls']} onPageChange={setPage} />
    </section>
  );
}
