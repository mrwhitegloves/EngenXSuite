import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Video } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import {
  FormError,
  compactInputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useMeetingActions, useMeetingOptions, useMeetings } from '../api.js';
import MeetingDetail from '../components/MeetingDetail.jsx';
import MeetingDialog from '../components/MeetingDialog.jsx';
import {
  STATUS_LABELS,
  addDays,
  dayKey,
  daysOf,
  formatDay,
  formatTime,
  parseDayKey,
  startOfDay,
  stepFrom,
  titleOf,
} from '../dates.js';

const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_CLASS = {
  scheduled: 'border-brand bg-brand-soft',
  completed: 'border-border bg-page text-text-muted',
  no_show: 'border-border bg-page text-text-muted',
  cancelled: 'border-border bg-page text-text-muted line-through',
};

// One meeting in the calendar: its time and title; a click opens it.
function MeetingChip({ meeting, onOpen, isWide = false }) {
  return (
    <button
      type="button"
      title={`${formatTime(meeting.startAt)} ${meeting.title}`}
      onClick={() => onOpen(meeting.id)}
      className={`block w-full rounded border px-1.5 py-0.5 text-left text-xs hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand ${STATUS_CLASS[meeting.status]} ${isWide ? 'py-1.5 text-sm' : 'truncate'}`}
    >
      {meeting.meetLink && (
        <Video size={11} aria-label="Has a Google Meet link" className="mr-1 inline align-[-1px]" />
      )}
      <span className="font-medium">{formatTime(meeting.startAt)}</span> {meeting.title}
      {isWide && (
        <span className="block text-xs text-text-muted no-underline">
          {[meeting.account?.name, meeting.organizer?.name, STATUS_LABELS[meeting.status]]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </button>
  );
}

// The calendar: every meeting the person may see, by month, week or day. Meetings of a
// connected Google Calendar are kept in step both ways.
export default function CalendarPage() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((item) => item.id === params.get('view')) ?? VIEWS[0];
  const date = parseDayKey(params.get('date'));
  const isMine = params.get('mine') === 'true';
  const openId = params.get('meeting');
  // null: closed. Otherwise the day a new meeting starts on (undefined: today).
  const [planning, setPlanning] = useState(null);
  const change = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };

  const days = daysOf(view.id, date);
  const options = useMeetingOptions();
  const { sync } = useMeetingActions();
  const meetings = useMeetings({
    from: days[0].toISOString(),
    to: addDays(days.at(-1), 1).toISOString(),
    ...(isMine ? { mine: 'true' } : {}),
  });
  const byDay = new Map();
  for (const meeting of meetings.data ?? []) {
    const key = dayKey(new Date(meeting.startAt));
    byDay.set(key, [...(byDay.get(key) ?? []), meeting]);
  }
  const today = dayKey(new Date());
  const open = (id) => change({ meeting: id });
  // Month on a phone: only the days that have a meeting, as a list.
  const listedDays = view.id === 'month' ? days.filter((day) => byDay.has(dayKey(day))) : days;

  return (
    <>
      <PageHeader title="Calendar" description="Meetings and plant visits with your customers.">
        {options.data?.isCalendarConnected && (
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
            Read my Google Calendar now
          </button>
        )}
        {can('meetings', 'create') && (
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => setPlanning({ day: view.id === 'day' ? date : undefined })}
          >
            <Plus size={16} aria-hidden="true" />
            Plan a meeting
          </button>
        )}
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Earlier"
          className={secondaryButtonClass}
          onClick={() => change({ date: dayKey(stepFrom(view.id, date, -1)) })}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Later"
          className={secondaryButtonClass}
          onClick={() => change({ date: dayKey(stepFrom(view.id, date, 1)) })}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => change({ date: '' })}>
          Today
        </button>
        <h2 className="mr-auto font-semibold">{titleOf(view.id, date)}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-brand"
            checked={isMine}
            onChange={(event) => change({ mine: event.target.checked ? 'true' : '' })}
          />
          Only mine
        </label>
        <select
          aria-label="View"
          value={view.id}
          onChange={(event) =>
            change({ view: event.target.value === 'month' ? '' : event.target.value })
          }
          className={compactInputClass}
        >
          {VIEWS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <FormError message={meetings.error?.message ?? sync.error?.message} />
      {sync.isSuccess && (
        <p role="status" className="mb-2 text-xs text-text-muted">
          Google Calendar was read: {sync.data.data.changed}{' '}
          {sync.data.data.changed === 1 ? 'meeting' : 'meetings'} changed.
        </p>
      )}
      {options.data && !options.data.isCalendarConnected && (
        <p className="mb-3 text-xs text-text-muted">
          Your Google Calendar is not connected: your meetings are kept here only. Connect it under
          “Mail and calendar” in your profile.
        </p>
      )}

      {view.id === 'month' && (
        <div
          role="grid"
          aria-label={titleOf(view.id, date)}
          className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block"
        >
          <div
            role="row"
            className="grid grid-cols-7 border-b border-border text-xs text-text-muted"
          >
            {WEEKDAYS.map((name) => (
              <span key={name} role="columnheader" className="px-2 py-1">
                {name}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = dayKey(day);
              const rows = byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  role="gridcell"
                  className={`min-h-24 min-w-0 space-y-1 border-r border-b border-border p-1 ${day.getMonth() === date.getMonth() ? '' : 'bg-page'}`}
                >
                  <button
                    type="button"
                    aria-label={`Open ${formatDay(day)}`}
                    onClick={() => change({ view: 'day', date: key })}
                    className={`rounded px-1 text-xs hover:underline focus-visible:outline-2 focus-visible:outline-brand ${key === today ? 'bg-brand font-semibold text-on-brand' : 'text-text-muted'}`}
                  >
                    {day.getDate()}
                  </button>
                  {rows.slice(0, 3).map((meeting) => (
                    <MeetingChip key={meeting.id} meeting={meeting} onOpen={open} />
                  ))}
                  {rows.length > 3 && (
                    <button
                      type="button"
                      className="text-xs text-text-muted hover:underline"
                      onClick={() => change({ view: 'day', date: key })}
                    >
                      {rows.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`space-y-3 ${view.id === 'month' ? 'md:hidden' : ''} ${view.id === 'week' ? 'lg:grid lg:grid-cols-7 lg:gap-2 lg:space-y-0' : ''}`}
      >
        {meetings.isSuccess && listedDays.length === 0 && (
          <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
            No meetings this month.
          </p>
        )}
        {listedDays.map((day) => {
          const key = dayKey(day);
          const rows = byDay.get(key) ?? [];
          return (
            <section key={key} aria-label={formatDay(day)} className="min-w-0 space-y-1">
              <h3
                className={`text-sm font-medium ${key === today ? 'text-brand-text' : 'text-text-muted'}`}
              >
                {formatDay(day)}
                {key === today && ' · today'}
              </h3>
              {rows.length === 0 ? (
                <p className="rounded border border-dashed border-border px-2 py-1.5 text-xs text-text-muted">
                  Nothing planned
                </p>
              ) : (
                rows.map((meeting) => (
                  <MeetingChip key={meeting.id} meeting={meeting} onOpen={open} isWide />
                ))
              )}
              {can('meetings', 'create') &&
                view.id !== 'month' &&
                day >= startOfDay(new Date()) && (
                  <button
                    type="button"
                    className="text-xs text-text-muted hover:text-brand-text hover:underline"
                    onClick={() => setPlanning({ day })}
                  >
                    + Plan here
                  </button>
                )}
            </section>
          );
        })}
      </div>

      {planning && <MeetingDialog day={planning.day} onClose={() => setPlanning(null)} />}
      {openId && <MeetingDetail meetingId={openId} onClose={() => change({ meeting: '' })} />}
    </>
  );
}
