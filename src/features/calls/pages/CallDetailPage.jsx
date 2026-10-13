import { useState } from 'react';
import { ArrowLeft, Link2, Play } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useCallDetail, useRecordingLink, useSetOutcome } from '../api.js';
import CallTranscript from '../components/CallTranscript.jsx';
import LinkCallDialog from '../components/LinkCallDialog.jsx';
import {
  DID_NOT_HAPPEN,
  DIRECTION_LABELS,
  OUTCOME_LABELS,
  STATUS_LABELS,
  formatExactMoment,
  formatLength,
  formatRupees,
} from '../labels.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const linkClass = 'hover:text-brand-text hover:underline';
const NOTHING = <span className="text-text-muted">–</span>;

const moment = (value) => (value ? formatExactMoment(value) : NOTHING);
const seconds = (value) => (value === null || value === undefined ? NOTHING : `${value} s`);

// A titled block of the page, like the blocks of the telephone company's own call page.
function Block({ title, children }) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-2.5 font-semibold">{title}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

// Label and value pairs, in two columns on a wide screen.
function Facts({ items }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2 text-sm">
          <dt className="text-text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value ?? NOTHING}</dd>
        </div>
      ))}
    </dl>
  );
}

function Insights({ call }) {
  const [isLinking, setIsLinking] = useState(false);
  const outcome = useSetOutcome();
  const recording = useRecordingLink();
  const who = call.contact?.name ?? call.number;
  const totalLegs = call.legs.reduce((sum, leg) => sum + (leg.costInr ?? 0), 0);

  return (
    <div className="space-y-4">
      <Block title="Call recording">
        {!call.hasRecording && (
          <p className="text-sm text-text-muted">
            This call has no recording. Recording is switched on in Settings → Calls.
          </p>
        )}
        {call.hasRecording && (
          <div className="space-y-3">
            {call.permissions.canPlayRecording ? (
              <>
                {!recording.data && (
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
                {recording.data && (
                  <audio
                    controls
                    autoPlay
                    src={recording.data.data.url}
                    aria-label={`Recording of the call with ${who}`}
                    className="w-full max-w-xl"
                  />
                )}
                <FormError message={recording.error?.message} />
              </>
            ) : (
              <p className="text-sm text-text-muted">You may not listen to this recording.</p>
            )}
            <Facts
              items={[
                ['Recorded', 'Yes'],
                [
                  'Announcement',
                  call.recordingConsentPlayed ? 'Played before the call' : 'Not played',
                ],
                [
                  'Length of the call',
                  call.durationSec > 0 ? formatLength(call.durationSec) : null,
                ],
                ['Text of the call', call.hasTranscript ? 'Made' : 'Not made yet'],
              ]}
            />
            {call.permissions.canPlayRecording && <CallTranscript call={call} who={who} />}
          </div>
        )}
      </Block>

      <Block title="Call details">
        <Facts
          items={[
            ['Started', moment(call.startedAt)],
            ['Direction', DIRECTION_LABELS[call.direction]],
            ['Picked up', moment(call.answeredAt)],
            ['From', call.fromNumber],
            ['Ended', moment(call.endedAt)],
            ['To', call.toNumber],
            ['Rang for', seconds(call.ringSec)],
            [
              'Result',
              <span
                key="result"
                className={DID_NOT_HAPPEN.includes(call.status) ? 'text-danger' : ''}
              >
                {STATUS_LABELS[call.status] ?? call.status}
              </span>,
            ],
            ['Talk time', call.durationSec > 0 ? formatLength(call.durationSec) : null],
            ['How it ended', call.hangupCauseName],
            [
              'Total charge',
              call.costInr > 0 ? (
                <>
                  {formatRupees(call.costInr)}
                  {!call.isSettled && (
                    <span className="block text-xs text-text-muted">
                      Not yet checked against the telephone company’s record.
                    </span>
                  )}
                </>
              ) : null,
            ],
            ['Hung up by', call.hangupSource],
            ['Our person', call.user?.name],
            ['Picked up by', call.answeredBy?.name],
            [
              'Person',
              <span key="person" className="inline-flex flex-wrap items-center gap-2">
                {call.contact?.name ?? <span className="text-text-muted">Unknown</span>}
                {call.permissions.canEdit && (
                  <button type="button" className={smallButton} onClick={() => setIsLinking(true)}>
                    <Link2 size={12} aria-hidden="true" />
                    {call.contact ? 'Change the person' : 'Say who it was'}
                  </button>
                )}
              </span>,
            ],
            [
              'Company',
              call.account && (
                <Link to={`/accounts/${call.account.id}`} className={linkClass}>
                  {call.account.name}
                </Link>
              ),
            ],
            [
              'Lead',
              call.lead && (
                <Link to={`/pipeline/${call.lead.id}`} className={linkClass}>
                  {call.lead.name}
                </Link>
              ),
            ],
            [
              'What came of it',
              call.permissions.canEdit ? (
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
                OUTCOME_LABELS[call.outcome]
              ),
            ],
            ['Call id', call.plivoCallUuid],
          ]}
        />
        <FormError message={outcome.error?.message} />
      </Block>

      <Block title="Call relations">
        <p className="mb-3 text-sm text-text-muted">
          A call has two sides: our person’s phone and the customer’s. The telephone company charges
          each side.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">The sides of this call</caption>
            <thead className="border-b border-border text-xs uppercase text-text-muted">
              <tr>
                {['Side', 'Who', 'From', 'To', 'Length', 'Charge', 'How it ended'].map((head) => (
                  <th key={head} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {call.legs.map((leg) => (
                <tr key={leg.relation} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{leg.relation}</td>
                  <td className="px-3 py-2">{leg.who}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{leg.from ?? NOTHING}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{leg.to ?? NOTHING}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{seconds(leg.durationSec)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {leg.costInr > 0 ? formatRupees(leg.costInr) : NOTHING}
                  </td>
                  <td className="px-3 py-2">{leg.hangupCause ?? NOTHING}</td>
                </tr>
              ))}
            </tbody>
            {totalLegs > 0 && (
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td colSpan={5} className="px-3 py-2 text-right">
                    Both sides together
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatRupees(totalLegs)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Block>
      {isLinking && <LinkCallDialog call={call} onClose={() => setIsLinking(false)} />}
    </div>
  );
}

// What happened in the call, step by step.
function Logs({ events }) {
  if (events.length === 0)
    return <p className="text-sm text-text-muted">Nothing was written down for this call.</p>;
  return (
    <Block title="What happened, step by step">
      <ol className="space-y-3">
        {events.map((event, index) => (
          <li key={`${event.at}-${index}`} className="flex gap-3 text-sm">
            <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
            <div>
              <p>{event.what}</p>
              <p className="text-xs text-text-muted">{formatExactMoment(event.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

// The telephone company's own words about the call, for finding a fault.
function RawLogs({ raw }) {
  const parts = [
    ['When the call ended (first side)', raw.hangup],
    ['When the second side ended', raw.dial],
    ['Its record of the first side', raw.aLeg],
    ['Its record of the second side', raw.bLeg],
  ].filter(([, value]) => value);
  if (parts.length === 0)
    return <p className="text-sm text-text-muted">Nothing was received for this call.</p>;
  return (
    <div className="space-y-4">
      {parts.map(([title, value]) => (
        <Block key={title} title={title}>
          <pre className="overflow-x-auto text-xs">{JSON.stringify(value, null, 2)}</pre>
        </Block>
      ))}
    </div>
  );
}

// One call in full: its recording, its details, both of its sides, and what happened.
export default function CallDetailPage() {
  const { callId } = useParams();
  const detail = useCallDetail(callId);
  const [tab, setTab] = useState('insights');
  const call = detail.data;
  const tabs = [
    { id: 'insights', label: 'Call insights' },
    { id: 'logs', label: 'Logs' },
    ...(call?.raw ? [{ id: 'raw', label: 'Raw logs' }] : []),
  ];

  return (
    <>
      <Link
        to="/calls"
        className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Call log
      </Link>
      {detail.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading the call…
        </p>
      )}
      <FormError message={detail.error?.message} />
      {call && (
        <>
          <div className="mb-4">
            <h1 className="text-xl font-semibold">
              {DIRECTION_LABELS[call.direction]} call {call.direction === 'inbound' ? 'from' : 'to'}{' '}
              {call.contact?.name ?? call.number}
            </h1>
            <p className="mt-0.5 text-text-muted">
              {formatExactMoment(call.startedAt)} · {STATUS_LABELS[call.status] ?? call.status}
              {call.durationSec > 0 && ` · ${formatLength(call.durationSec)}`}
              {call.costInr > 0 && ` · ${formatRupees(call.costInr)}`}
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Parts of the call"
            className="mb-4 flex flex-wrap gap-1 border-b border-border"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === tab}
                onClick={() => setTab(item.id)}
                className={[
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand',
                  item.id === tab
                    ? 'border-brand text-brand-text'
                    : 'border-transparent text-text-muted hover:text-text',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab === 'insights' && <Insights call={call} />}
          {tab === 'logs' && <Logs events={call.events} />}
          {tab === 'raw' && call.raw && <RawLogs raw={call.raw} />}
        </>
      )}
    </>
  );
}
