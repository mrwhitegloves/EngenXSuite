import { useEffect, useState } from 'react';
import { FileText, Link2, PhoneCall, PhoneIncoming, PhoneOutgoing, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import DateRangeFilter, {
  DATE_PRESET_LABELS,
  dateRangeParams,
} from '../../../components/shared/DateRangeFilter.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useListParams } from '../../../hooks/useListParams.js';
import { useCallOptions, useCalls, useRecordingLink, useSetOutcome } from '../api.js';
import CallTranscript from '../components/CallTranscript.jsx';
import LinkCallDialog from '../components/LinkCallDialog.jsx';
import {
  DID_NOT_HAPPEN,
  DIRECTION_LABELS,
  OUTCOME_LABELS,
  STATUS_LABELS,
  formatLength,
  formatMoment,
  formatRupees,
} from '../labels.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs whitespace-nowrap hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

// The recording of a call, asked for when its row is opened (opening it is written down).
function RecordingPlayer({ call, who }) {
  const recording = useRecordingLink();
  const { mutate } = recording;
  useEffect(() => {
    mutate(call.id);
  }, [mutate, call.id]);
  return (
    <div className="space-y-1">
      {recording.isPending && (
        <p role="status" className="text-sm text-text-muted">
          Opening the recording…
        </p>
      )}
      <FormError message={recording.error?.message} />
      {recording.data && (
        <audio
          controls
          autoPlay
          src={recording.data.data.url}
          aria-label={`Recording of the call with ${who}`}
          className="w-full max-w-md"
        />
      )}
    </div>
  );
}

// The call log: every call the person may see (their own, their team's, or everyone's), as a
// table with search, filters, sorting and pages. A row opens the page of that call.
export default function CallLogPage() {
  const list = useListParams([
    'search',
    'direction',
    'status',
    'outcome',
    'userId',
    'recording',
    'linked',
    'range',
    'from',
    'to',
  ]);
  const { search, direction, status, outcome, userId, recording, linked, range, from, to } =
    list.values;
  const dates = { range, from, to };
  const options = useCallOptions();
  const calls = useCalls(
    Object.fromEntries(
      Object.entries({
        search,
        direction,
        status,
        outcome,
        userId,
        recording,
        linked,
        sort: list.sort,
        ...dateRangeParams(dates),
      }).filter(([, value]) => value),
    ),
    { page: list.page, pageSize: 25 },
  );
  const setOutcome = useSetOutcome();
  // What is open under a row: { id, kind: 'recording' | 'text' }; and the call being re-linked.
  const [open, setOpen] = useState(null);
  const [linking, setLinking] = useState(null);
  const rows = calls.data?.data ?? [];
  const users = options.data?.users ?? [];
  const toggle = (id, kind) =>
    setOpen((current) => (current?.id === id && current.kind === kind ? null : { id, kind }));
  const whoOf = (call) => call.contact?.name ?? call.number;

  const chip = (key, label, clear = { [key]: '' }) => ({
    key,
    label,
    onRemove: () => list.setFilters(clear),
  });
  const chips = [
    search && chip('search', `Search: ${search}`),
    direction && chip('direction', DIRECTION_LABELS[direction]),
    status && chip('status', `Result: ${STATUS_LABELS[status]}`),
    outcome && chip('outcome', `Came of it: ${OUTCOME_LABELS[outcome]}`),
    userId && chip('userId', `By: ${users.find((user) => user.id === userId)?.name ?? 'Chosen'}`),
    recording && chip('recording', 'With a recording'),
    linked && chip('linked', linked === 'no' ? 'Unknown numbers' : 'Known people'),
    range &&
      chip(
        'range',
        range === 'custom' && from && to
          ? `When: ${from} to ${to}`
          : `When: ${DATE_PRESET_LABELS[range] ?? range}`,
        { range: '', from: '', to: '' },
      ),
  ].filter(Boolean);

  const filterSelect = (key, label, emptyLabel, choices) => (
    <select
      aria-label={label}
      value={list.values[key]}
      onChange={(event) => list.setFilters({ [key]: event.target.value })}
      className={compactInputClass}
    >
      <option value="">{emptyLabel}</option>
      {choices.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </select>
  );

  const columns = [
    {
      key: 'startedAt',
      header: 'When',
      sortKey: 'startedAt',
      className: 'whitespace-nowrap',
      render: (call) => (
        <Link
          to={`/calls/${call.id}`}
          className="font-medium hover:text-brand-text hover:underline"
        >
          {formatMoment(call.startedAt)}
        </Link>
      ),
    },
    {
      key: 'result',
      header: 'Call',
      className: 'whitespace-nowrap',
      render: (call) => {
        const Icon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon size={14} aria-hidden="true" className="text-text-muted" />
            <span>
              {DIRECTION_LABELS[call.direction]}
              <span
                className={`block text-xs ${DID_NOT_HAPPEN.includes(call.status) ? 'text-danger' : 'text-text-muted'}`}
              >
                {STATUS_LABELS[call.status] ?? call.status}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      key: 'person',
      header: 'Person',
      render: (call) => (
        <>
          {call.contact?.name ?? <span className="text-text-muted">Unknown</span>}
          <span className="block text-xs whitespace-nowrap text-text-muted">{call.number}</span>
        </>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (call) =>
        call.account ? (
          <Link
            to={`/accounts/${call.account.id}`}
            className="hover:text-brand-text hover:underline"
          >
            {call.account.name}
          </Link>
        ) : (
          <span className="text-text-muted">–</span>
        ),
    },
    {
      key: 'lead',
      header: 'Lead',
      render: (call) =>
        call.lead ? (
          <Link to={`/pipeline/${call.lead.id}`} className="hover:text-brand-text hover:underline">
            {call.lead.name}
          </Link>
        ) : (
          <span className="text-text-muted">–</span>
        ),
    },
    {
      key: 'user',
      header: 'By',
      render: (call) => (
        <>
          {call.user?.name ?? <span className="text-text-muted">Nobody</span>}
          {call.answeredBy && (
            <span className="block text-xs text-text-muted">
              picked up by {call.answeredBy.name}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'durationSec',
      header: 'Length',
      sortKey: 'durationSec',
      className: 'whitespace-nowrap',
      render: (call) =>
        call.durationSec > 0 ? (
          formatLength(call.durationSec)
        ) : (
          <span className="text-text-muted">–</span>
        ),
    },
    {
      key: 'cost',
      header: 'Charge',
      sortKey: 'cost',
      className: 'whitespace-nowrap',
      render: (call) =>
        call.costInr > 0 ? formatRupees(call.costInr) : <span className="text-text-muted">–</span>,
    },
    {
      key: 'actions',
      header: 'What came of it, and actions',
      render: (call) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {call.permissions.canEdit ? (
            <select
              aria-label={`What came of the call with ${whoOf(call)}`}
              value={call.outcome ?? ''}
              disabled={setOutcome.isPending}
              onChange={(event) =>
                setOutcome.mutate({ id: call.id, outcome: event.target.value || null })
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
            <button type="button" className={smallButton} onClick={() => setLinking(call)}>
              <Link2 size={12} aria-hidden="true" />
              {call.contact ? 'Change the person' : 'Say who it was'}
            </button>
          )}
          {call.permissions.canPlayRecording && (
            <>
              <button
                type="button"
                className={smallButton}
                aria-expanded={open?.id === call.id && open.kind === 'text'}
                onClick={() => toggle(call.id, 'text')}
              >
                <FileText size={12} aria-hidden="true" />
                {call.hasTranscript ? 'Text of the call' : 'Text and AI summary'}
              </button>
              <button
                type="button"
                className={smallButton}
                aria-expanded={open?.id === call.id && open.kind === 'recording'}
                onClick={() => toggle(call.id, 'recording')}
              >
                <Play size={12} aria-hidden="true" />
                Listen
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Call log"
        description="Every call you may see: who, when, how long, what it cost, and what came of it."
      />
      <FilterBar
        search={{
          value: search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Search person, company, lead or number',
          label: 'Search calls',
        }}
        chips={chips}
        onClearAll={list.clearFilters}
        savedViews={{ screen: 'calls', currentQuery: list.viewQuery, onApply: list.applyView }}
      >
        {filterSelect('direction', 'Filter by direction', 'Incoming and outgoing', [
          ['outbound', 'Outgoing'],
          ['inbound', 'Incoming'],
        ])}
        {filterSelect('status', 'Filter by result', 'Every result', [
          ['completed', 'Talked'],
          ['missed', 'Missed'],
          ['no_answer', 'No answer'],
          ['busy', 'Busy'],
          ['failed', 'Did not go through'],
        ])}
        {filterSelect(
          'outcome',
          'Filter by what came of it',
          'Whatever came of it',
          Object.entries(OUTCOME_LABELS),
        )}
        {users.length > 1 &&
          filterSelect(
            'userId',
            'Filter by who called',
            'Everyone',
            users.map((user) => [user.id, user.name]),
          )}
        {filterSelect('recording', 'Filter by recording', 'With or without a recording', [
          ['yes', 'With a recording'],
        ])}
        {filterSelect('linked', 'Filter by known or unknown', 'Known and unknown numbers', [
          ['yes', 'Known people'],
          ['no', 'Unknown numbers'],
        ])}
        <DateRangeFilter label="When" value={dates} onChange={list.setFilters} />
      </FilterBar>

      <FormError
        message={calls.error?.message ?? options.error?.message ?? setOutcome.error?.message}
      />
      {calls.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading the calls…
        </p>
      )}
      {calls.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={PhoneCall}
          title={list.hasFilters ? 'No call matches these filters' : 'No calls yet'}
          description={
            list.hasFilters
              ? 'Change or clear the filters.'
              : 'A call shows here once it was made with the Call button, or came in on the company number.'
          }
        />
      )}
      {rows.length > 0 && (
        <DataTable
          caption="Calls"
          columns={columns}
          rows={rows}
          sort={list.sort}
          onSortChange={list.setSort}
          isRefreshing={calls.isPlaceholderData}
          renderBelow={(call) =>
            open?.id !== call.id ? null : open.kind === 'recording' ? (
              <RecordingPlayer call={call} who={whoOf(call)} />
            ) : (
              <CallTranscript call={call} who={whoOf(call)} />
            )
          }
        />
      )}
      <Pagination meta={calls.data?.meta} noun={['call', 'calls']} onPageChange={list.setPage} />
      {linking && <LinkCallDialog call={linking} onClose={() => setLinking(null)} />}
    </>
  );
}
