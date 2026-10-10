import { useState } from 'react';
import { PhoneIncoming, PhoneOutgoing, Play } from 'lucide-react';
import Pagination from '../../../components/shared/Pagination.jsx';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useCalls, useRecordingLink, useSetOutcome } from '../api.js';

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
          {call.contact && <> · {call.number}</>}
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
          {call.permissions.canPlayRecording && !recording.data && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
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
        <FormError message={outcome.error?.message ?? recording.error?.message} />
      </div>
    </li>
  );
}

/**
 * The phone calls of one lead or company, newest first: how each went, what came of it, and
 * its recording for someone who may listen.
 *
 * @param {{ target: { opportunityId?: string, accountId?: string, contactId?: string } }} props
 */
export default function RecordCalls({ target }) {
  const [page, setPage] = useState(1);
  const calls = useCalls(target, { page, pageSize: PAGE_SIZE });
  const rows = calls.data?.data ?? [];

  return (
    <section aria-label="Calls" className="space-y-2">
      <h2 className="font-semibold">Calls</h2>
      <FormError message={calls.error?.message} />
      {calls.isPending && (
        <p role="status" className="text-text-muted">
          Loading the calls…
        </p>
      )}
      {calls.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          No calls yet. Use the Call button next to a person’s phone number.
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
