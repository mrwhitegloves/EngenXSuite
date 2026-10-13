import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useBranding } from '../../../hooks/useBranding.js';
import { apiRequest } from '../../../lib/apiClient.js';

// The public booking page of one person: a customer picks a kind of meeting, a day and a free
// time, and leaves their name and email. No sign-in. Times are shown in the visitor's own
// time zone; days are counted in India time, where the meetings take place.

const MODE_WORDS = {
  online: 'Online, by Google Meet',
  physical: 'In person',
  plant_visit: 'Visit at your plant',
};
const DAY = 24 * 60 * 60 * 1000;
const indiaDay = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
const dayWords = (day) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${day}T12:00:00+05:30`),
  );
const shiftDay = (day, count) =>
  indiaDay(new Date(new Date(`${day}T12:00:00+05:30`).getTime() + count * DAY));
const timeWords = (value) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const momentWords = (value) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' }).format(
    new Date(value),
  );

export default function BookingPage() {
  const { slug } = useParams();
  const { companyName } = useBranding();
  const today = indiaDay(new Date());
  const [typeId, setTypeId] = useState('');
  const [day, setDay] = useState(today);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', note: '' });

  const page = useQuery({
    queryKey: ['public-booking', slug],
    queryFn: ({ signal }) => apiRequest(`/public/booking/${slug}`, { signal }),
    select: (payload) => payload.data,
    retry: false,
  });
  const type = page.data?.types.find((item) => item.id === typeId) ?? page.data?.types[0];
  const slots = useQuery({
    queryKey: ['public-booking', slug, 'slots', type?.id, day],
    queryFn: ({ signal }) =>
      apiRequest(`/public/booking/${slug}/slots?typeId=${type.id}&date=${day}`, { signal }),
    select: (payload) => payload.data.slots,
    enabled: Boolean(type),
  });
  const book = useMutation({
    mutationFn: (body) => apiRequest(`/public/booking/${slug}/book`, { method: 'POST', body }),
    // Taken a moment ago by someone else: show the times again.
    onError: () => slots.refetch(),
  });
  const errors = fieldErrorsFrom(book.error);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const lastDay = page.data ? shiftDay(today, page.data.maxDaysAhead) : today;
  const pick = (next) => {
    setDay(next);
    setSlot(null);
  };

  function submit(event) {
    event.preventDefault();
    const extra = Object.fromEntries(
      ['company', 'phone', 'note']
        .map((key) => [key, form[key].trim()])
        .filter(([, value]) => value),
    );
    book.mutate({
      typeId: type.id,
      startAt: slot,
      name: form.name.trim(),
      email: form.email.trim(),
      ...extra,
    });
  }

  const done = book.data?.data;
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-page px-4 py-8 text-text">
      {page.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {page.isError && (
        <p role="alert" className="rounded-lg border border-border bg-surface p-6">
          {page.error.status === 404
            ? 'This booking page does not exist, or it is switched off.'
            : page.error.message}
        </p>
      )}

      {page.data && done && (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <CalendarCheck size={22} aria-hidden="true" className="text-brand-text" />
            Your meeting is booked
          </h1>
          <p>
            {done.typeName} with {done.ownerName}
            {companyName ? ` (${companyName})` : ''}
          </p>
          <p className="font-medium">{momentWords(done.startAt)}</p>
          <p className="text-sm text-text-muted">{MODE_WORDS[done.mode]}</p>
          {done.meetLink ? (
            <p>
              <a
                href={done.meetLink}
                target="_blank"
                rel="noreferrer"
                className="text-brand-text hover:underline"
              >
                {done.meetLink}
              </a>
            </p>
          ) : null}
          <p className="text-sm text-text-muted">
            {done.meetLink
              ? 'An invitation with this link is on its way to your email address.'
              : `${done.ownerName} will confirm the details with you by email.`}
          </p>
        </section>
      )}

      {page.data && !done && (
        <div className="space-y-5">
          <header>
            <h1 className="text-xl font-semibold">Book a meeting with {page.data.ownerName}</h1>
            {companyName && <p className="text-text-muted">{companyName}</p>}
            {page.data.intro && <p className="mt-2 whitespace-pre-line">{page.data.intro}</p>}
          </header>

          {page.data.types.length === 0 && (
            <p className="rounded-lg border border-border bg-surface p-4 text-text-muted">
              No meeting can be booked here at the moment.
            </p>
          )}

          {type && (
            <>
              {page.data.types.length > 1 && (
                <fieldset className="space-y-1">
                  <legend className="mb-1 font-medium">What kind of meeting?</legend>
                  {page.data.types.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <input
                        type="radio"
                        name="type"
                        className="accent-brand"
                        checked={item.id === type.id}
                        onChange={() => {
                          setTypeId(item.id);
                          setSlot(null);
                        }}
                      />
                      <span>
                        {item.name}
                        <span className="block text-xs text-text-muted">
                          {item.durationMinutes} minutes · {MODE_WORDS[item.mode]}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {page.data.types.length === 1 && (
                <p className="text-sm text-text-muted">
                  {type.name} · {type.durationMinutes} minutes · {MODE_WORDS[type.mode]}
                </p>
              )}

              <section aria-label="Choose a time" className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label="The day before"
                    className={secondaryButtonClass}
                    disabled={day <= today}
                    onClick={() => pick(shiftDay(day, -1))}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="The next day"
                    className={secondaryButtonClass}
                    disabled={day >= lastDay}
                    onClick={() => pick(shiftDay(day, 1))}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  <h2 className="font-medium">{dayWords(day)}</h2>
                  <input
                    type="date"
                    aria-label="Day"
                    min={today}
                    max={lastDay}
                    value={day}
                    onChange={(event) => event.target.value && pick(event.target.value)}
                    className="ml-auto rounded-md border border-border bg-surface px-2 py-1 text-sm"
                  />
                </div>
                {slots.isPending && (
                  <p role="status" className="text-text-muted">
                    Looking for free times…
                  </p>
                )}
                <FormError message={slots.error?.message} />
                {slots.isSuccess && slots.data.length === 0 && (
                  <p className="rounded-md border border-dashed border-border p-3 text-text-muted">
                    No free time on this day. Try another day.
                  </p>
                )}
                <ul aria-label="Free times" className="flex flex-wrap gap-2">
                  {(slots.data ?? []).map((start) => (
                    <li key={start}>
                      <button
                        type="button"
                        aria-pressed={slot === start}
                        onClick={() => setSlot(start)}
                        className={`rounded-md border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand ${slot === start ? 'border-brand bg-brand text-on-brand' : 'border-border bg-surface hover:border-text-muted'}`}
                      >
                        {timeWords(start)}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-text-muted">
                  Times are shown in your own time zone (
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}).
                </p>
              </section>

              {slot && (
                <form
                  noValidate
                  className="space-y-3 rounded-lg border border-border bg-surface p-4"
                  onSubmit={submit}
                >
                  <p className="font-medium">{momentWords(slot)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Your name" error={errors.name}>
                      {(props) => (
                        <input
                          {...props}
                          autoComplete="name"
                          maxLength={120}
                          value={form.name}
                          onChange={set('name')}
                          className={inputClass}
                        />
                      )}
                    </Field>
                    <Field label="Your email address" error={errors.email}>
                      {(props) => (
                        <input
                          {...props}
                          type="email"
                          autoComplete="email"
                          value={form.email}
                          onChange={set('email')}
                          className={inputClass}
                        />
                      )}
                    </Field>
                    <Field label="Your company (optional)" error={errors.company}>
                      {(props) => (
                        <input
                          {...props}
                          autoComplete="organization"
                          maxLength={200}
                          value={form.company}
                          onChange={set('company')}
                          className={inputClass}
                        />
                      )}
                    </Field>
                    <Field label="Your phone number (optional)" error={errors.phone}>
                      {(props) => (
                        <input
                          {...props}
                          type="tel"
                          autoComplete="tel"
                          maxLength={30}
                          value={form.phone}
                          onChange={set('phone')}
                          className={inputClass}
                        />
                      )}
                    </Field>
                  </div>
                  <Field label="What would you like to talk about? (optional)" error={errors.note}>
                    {(props) => (
                      <textarea
                        {...props}
                        rows={3}
                        maxLength={1000}
                        value={form.note}
                        onChange={set('note')}
                        className={inputClass}
                      />
                    )}
                  </Field>
                  <FormError
                    message={Object.keys(errors).length === 0 ? book.error?.message : null}
                  />
                  <button
                    type="submit"
                    className={primaryButtonClass}
                    disabled={!form.name.trim() || !form.email.trim() || book.isPending}
                  >
                    {book.isPending ? 'Booking…' : 'Book this time'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
