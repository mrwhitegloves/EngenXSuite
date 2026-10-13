import { useState } from 'react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useBookingPage, useUpdateBookingPage } from '../api.js';

const WEEKDAYS = [
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
  [6, 'Saturday'],
  [0, 'Sunday'],
];
const pad = (number) => String(number).padStart(2, '0');
const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// The form itself, once the page is loaded.
function PageForm({ page, onClose }) {
  const save = useUpdateBookingPage();
  const [isCopied, setIsCopied] = useState(false);
  const [form, setForm] = useState({
    isActive: page.isActive,
    intro: page.intro,
    meetingTypeIds: page.meetingTypeIds,
    bufferMinutes: page.bufferMinutes,
    maxDaysAhead: page.maxDaysAhead,
    // One time span per weekday: { 1: { start: '10:00', end: '18:00' }, … }
    hours: Object.fromEntries(
      page.availability.map((item) => [
        item.weekday,
        { start: toTime(item.startMinute), end: toTime(item.endMinute) },
      ]),
    ),
  });
  const link = `${window.location.origin}/book/${page.slug}`;
  const setHours = (weekday, value) => {
    const hours = { ...form.hours };
    if (value) hours[weekday] = value;
    else delete hours[weekday];
    setForm({ ...form, hours });
  };

  function submit(event) {
    event.preventDefault();
    const { hours, ...rest } = form;
    save.mutate(
      {
        ...rest,
        bufferMinutes: Number(form.bufferMinutes),
        maxDaysAhead: Number(form.maxDaysAhead),
        availability: Object.entries(hours).map(([weekday, span]) => ({
          weekday: Number(weekday),
          startMinute: toMinutes(span.start),
          endMinute: toMinutes(span.end),
        })),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form noValidate className="space-y-4 text-sm" onSubmit={submit}>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-brand"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
        />
        <span>
          <span className="font-medium">My booking page is on</span>
          <span className="block text-xs text-text-muted">
            Anyone with the link can then book a free time with you. They see only free times, never
            what is in your calendar.
          </span>
        </span>
      </label>
      <div>
        <p className="mb-1 font-medium">The link to give to customers</p>
        <p className="flex flex-wrap items-center gap-2">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 break-all text-brand-text hover:underline"
          >
            {link}
          </a>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setIsCopied(true);
            }}
          >
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block font-medium">A few words for the customer</span>
        <textarea
          rows={2}
          maxLength={500}
          value={form.intro}
          onChange={(event) => setForm({ ...form, intro: event.target.value })}
          className={inputClass}
        />
      </label>
      <fieldset>
        <legend className="mb-1 font-medium">Kinds of meeting on the page</legend>
        {page.bookableTypes.length === 0 && (
          <p className="text-text-muted">
            No kind of meeting is marked as bookable. That is done in Settings → Meeting types.
          </p>
        )}
        {page.bookableTypes.map((type) => (
          <label key={type.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={form.meetingTypeIds.includes(type.id)}
              onChange={(event) =>
                setForm({
                  ...form,
                  meetingTypeIds: event.target.checked
                    ? [...form.meetingTypeIds, type.id]
                    : form.meetingTypeIds.filter((id) => id !== type.id),
                })
              }
            />
            {type.name} ({type.durationMinutes} minutes)
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 font-medium">When I take meetings (India time)</legend>
        <div className="space-y-1">
          {WEEKDAYS.map(([weekday, name]) => {
            const span = form.hours[weekday];
            return (
              <div key={weekday} className="flex flex-wrap items-center gap-2">
                <label className="flex w-32 items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={Boolean(span)}
                    onChange={(event) =>
                      setHours(
                        weekday,
                        event.target.checked ? { start: '10:00', end: '18:00' } : null,
                      )
                    }
                  />
                  {name}
                </label>
                {span ? (
                  <>
                    <input
                      type="time"
                      aria-label={`${name} from`}
                      value={span.start}
                      onChange={(event) =>
                        setHours(weekday, { ...span, start: event.target.value })
                      }
                      className="rounded-md border border-border bg-surface px-2 py-1"
                    />
                    <span className="text-text-muted">to</span>
                    <input
                      type="time"
                      aria-label={`${name} to`}
                      value={span.end}
                      onChange={(event) => setHours(weekday, { ...span, end: event.target.value })}
                      className="rounded-md border border-border bg-surface px-2 py-1"
                    />
                  </>
                ) : (
                  <span className="text-text-muted">no meetings</span>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-medium">Free minutes around every meeting</span>
          <input
            type="number"
            min={0}
            max={120}
            step={5}
            value={form.bufferMinutes}
            onChange={(event) => setForm({ ...form, bufferMinutes: event.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">How many days ahead can be booked</span>
          <input
            type="number"
            min={1}
            max={90}
            value={form.maxDaysAhead}
            onChange={(event) => setForm({ ...form, maxDaysAhead: event.target.value })}
            className={inputClass}
          />
        </label>
      </div>
      <FormError message={save.error?.message} />
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={primaryButtonClass} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// My public booking page: on or off, the link, the hours, the kinds of meeting.
export default function BookingPageDialog({ onClose }) {
  const page = useBookingPage();
  return (
    <Dialog open wide title="My booking page" onClose={onClose}>
      {page.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      <FormError message={page.error?.message} />
      {page.data && <PageForm page={page.data} onClose={onClose} />}
    </Dialog>
  );
}
