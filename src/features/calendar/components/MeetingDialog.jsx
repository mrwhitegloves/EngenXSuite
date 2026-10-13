import { useState } from 'react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useAccountContacts } from '../../accounts/api.js';
import RecordPicker from '../../assistant/components/RecordPicker.jsx';
import { useLeadAccountId, useMeetingActions, useMeetingOptions } from '../api.js';
import { MODE_LABELS, toMomentInput } from '../dates.js';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const MINUTE = 60 * 1000;

/** The next full hour, as the start a new meeting is offered with. */
function nextHour(day) {
  const now = new Date();
  const base = day && day > now ? new Date(day) : now;
  if (day && day > now) base.setHours(10, 0, 0, 0);
  else base.setHours(base.getHours() + 1, 0, 0, 0);
  return base;
}

// Tick boxes for a list of people.
function PeoplePicker({ legend, people, chosen, onChange, empty }) {
  const toggle = (id) =>
    onChange(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {people.length === 0 ? (
        <p className="text-sm text-text-muted">{empty}</p>
      ) : (
        <div className="grid max-h-36 gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
          {people.map((person) => (
            <label key={person.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-brand"
                checked={chosen.includes(person.id)}
                onChange={() => toggle(person.id)}
              />
              <span className="min-w-0 truncate">
                {person.name}
                {person.note && <span className="text-text-muted"> ({person.note})</span>}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

// The customer's people. Loaded only once the company is known.
function CustomerPeople({ accountId, chosen, onChange }) {
  const contacts = useAccountContacts(accountId);
  return (
    <PeoplePicker
      legend="From the customer"
      people={(contacts.data ?? []).map((contact) => ({
        id: contact.id,
        name: contact.name,
        note: contact.email ? null : 'no email: gets no invitation',
      }))}
      chosen={chosen}
      onChange={onChange}
      empty={contacts.isPending ? 'Loading…' : 'This company has no people yet.'}
    />
  );
}

/**
 * Plan a meeting (no `meeting`) or change one that is still planned.
 * @param {{ meeting?: object, target?: { opportunityId?: string, accountId?: string, title?: string },
 *           day?: Date, onClose: () => void }} props
 *        target: the lead or company a new meeting is about, when it is planned from its page
 *        day: the day a new meeting starts on, when it is planned from the calendar
 */
export default function MeetingDialog({ meeting, target, day, onClose }) {
  const isNew = !meeting;
  const options = useMeetingOptions();
  const actions = useMeetingActions();
  const save = isNew ? actions.create : actions.update;
  // What a new meeting is about; chosen here when it was not given.
  const [about, setAbout] = useState(target ?? null);
  const leadAccount = useLeadAccountId(isNew && !about?.accountId ? about?.opportunityId : null);
  const accountId = isNew ? (about?.accountId ?? leadAccount.data) : meeting.account?.id;
  const start = isNew ? nextHour(day) : new Date(meeting.startAt);
  const [form, setForm] = useState({
    title: meeting?.title ?? '',
    mode: meeting?.mode ?? 'online',
    startAt: toMomentInput(start),
    minutes: isNew ? 60 : Math.round((new Date(meeting.endAt) - start) / MINUTE),
    location: meeting?.location ?? '',
    agenda: meeting?.agenda ?? '',
    contactIds: meeting?.attendees.map((person) => person.contactId).filter(Boolean) ?? [],
    internalAttendeeIds: meeting?.colleagues.map((person) => person.id) ?? [],
    // Guests who are not people of the company: their addresses, as typed.
    extraGuests: (meeting?.attendees ?? [])
      .filter((person) => !person.contactId && person.email)
      .map((person) => person.email)
      .join(', '),
    guestOptions: meeting?.guestOptions ?? {
      canInviteOthers: true,
      canModify: false,
      canSeeGuests: true,
    },
    tellGuests: true,
  });
  const errors = fieldErrorsFrom(save.error);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const durations = DURATIONS.includes(form.minutes)
    ? DURATIONS
    : [...DURATIONS, form.minutes].sort((a, b) => a - b);

  function submit(event) {
    event.preventDefault();
    const startAt = new Date(form.startAt);
    const body = {
      title: form.title.trim(),
      mode: form.mode,
      startAt: startAt.toISOString(),
      endAt: new Date(startAt.getTime() + form.minutes * MINUTE).toISOString(),
      location: form.location.trim(),
      agenda: form.agenda.trim(),
      internalAttendeeIds: form.internalAttendeeIds,
      ...(accountId ? { contactIds: form.contactIds } : {}),
      extraGuests: form.extraGuests
        .split(/[,;\s]+/)
        .filter(Boolean)
        .map((email) => ({ email })),
      guestOptions: form.guestOptions,
      tellGuests: form.tellGuests,
    };
    const links = about?.opportunityId
      ? { opportunityId: about.opportunityId }
      : about?.accountId
        ? { accountId: about.accountId }
        : {};
    save.mutate(isNew ? { ...body, ...links } : { id: meeting.id, ...body }, {
      onSuccess: onClose,
    });
  }

  return (
    <Dialog open wide title={isNew ? 'Plan a meeting' : 'Change the meeting'} onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={submit}>
        {isNew && !target && (
          <div>
            <p className="mb-1 text-sm font-medium">About</p>
            {about ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {about.title}
                <button
                  type="button"
                  className="text-brand-text hover:underline"
                  onClick={() => {
                    setAbout(null);
                    setForm({ ...form, contactIds: [] });
                  }}
                >
                  Change
                </button>
              </p>
            ) : (
              <RecordPicker
                label="Search a lead or a company (leave empty for an internal meeting)"
                types={['lead', 'account']}
                onPick={(record) =>
                  setAbout({
                    title: record.title,
                    ...(record.type === 'lead'
                      ? { opportunityId: record.id }
                      : { accountId: record.id }),
                  })
                }
              />
            )}
          </div>
        )}
        <Field label="Title" error={errors.title}>
          {(props) => (
            <input
              {...props}
              value={form.title}
              maxLength={200}
              autoFocus
              placeholder="For example: Pilot scope with the plant head"
              onChange={set('title')}
              className={inputClass}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Kind" error={errors.mode}>
            {(props) => (
              <select {...props} value={form.mode} onChange={set('mode')} className={inputClass}>
                {(options.data?.modes ?? Object.keys(MODE_LABELS)).map((mode) => (
                  <option key={mode} value={mode}>
                    {MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Starts" error={errors.startAt}>
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={form.startAt}
                onChange={set('startAt')}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Length" error={errors.endAt}>
            {(props) => (
              <select
                {...props}
                value={form.minutes}
                onChange={(event) => setForm({ ...form, minutes: Number(event.target.value) })}
                className={inputClass}
              >
                {durations.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes < 60
                      ? `${minutes} minutes`
                      : `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        {form.mode !== 'online' && (
          <Field label="Where" error={errors.location}>
            {(props) => (
              <input
                {...props}
                value={form.location}
                maxLength={300}
                placeholder={form.mode === 'plant_visit' ? 'The plant and its address' : 'Address'}
                onChange={set('location')}
                className={inputClass}
              />
            )}
          </Field>
        )}
        {accountId && (
          <CustomerPeople
            accountId={accountId}
            chosen={form.contactIds}
            onChange={(contactIds) => setForm({ ...form, contactIds })}
          />
        )}
        <PeoplePicker
          legend="Colleagues who join"
          people={options.data?.colleagues ?? []}
          chosen={form.internalAttendeeIds}
          onChange={(internalAttendeeIds) => setForm({ ...form, internalAttendeeIds })}
          empty="No other users."
        />
        <Field
          label="Other guests"
          error={errors.extraGuests}
          hint="Anyone else, by email address: a comma between several."
        >
          {(props) => (
            <input
              {...props}
              value={form.extraGuests}
              placeholder="name@company.com, other@company.com"
              onChange={set('extraGuests')}
              className={inputClass}
            />
          )}
        </Field>
        <Field
          label="What it is about"
          error={errors.agenda}
          hint="The guests read this in the invitation."
        >
          {(props) => (
            <textarea
              {...props}
              rows={3}
              maxLength={4000}
              value={form.agenda}
              onChange={set('agenda')}
              className={inputClass}
            />
          )}
        </Field>
        {options.data &&
          (options.data.isCalendarConnected ? (
            <div className="space-y-1 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-brand"
                  checked={form.tellGuests}
                  onChange={(event) => setForm({ ...form, tellGuests: event.target.checked })}
                />
                <span>
                  Google mails the invitation to the guests.
                  <span className="block text-xs text-text-muted">
                    The meeting goes into your Google Calendar
                    {form.mode === 'online' && !meeting?.meetLink
                      ? ', with a Google Meet link'
                      : ''}
                    .
                  </span>
                </span>
              </label>
              <p className="pl-6">
                <span className="mr-3 text-xs font-medium text-text-muted">Guests may:</span>
                {[
                  ['canInviteOthers', 'invite others'],
                  ['canSeeGuests', 'see the guest list'],
                  ['canModify', 'change the event'],
                ].map(([key, words]) => (
                  <label key={key} className="mr-4 inline-flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-brand"
                      checked={form.guestOptions[key]}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          guestOptions: { ...form.guestOptions, [key]: event.target.checked },
                        })
                      }
                    />
                    {words}
                  </label>
                ))}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Your Google Calendar is not connected: the meeting is kept in the CRM only, with no
              invitation and no Meet link. Connect it under “Mail and calendar” in your profile.
            </p>
          ))}
        <FormError
          message={
            errors.contactIds ??
            errors.internalAttendeeIds ??
            (Object.keys(errors).some((key) => key.startsWith('extraGuests'))
              ? 'One of the other guests is not an email address.'
              : null) ??
            (Object.keys(errors).length === 0 ? save.error?.message : null)
          }
        />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!form.title.trim() || !form.startAt || save.isPending}
          >
            {save.isPending ? 'Saving…' : isNew ? 'Plan the meeting' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
