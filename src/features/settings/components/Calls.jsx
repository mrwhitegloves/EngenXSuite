import { useState } from 'react';
import {
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCallSettings, useRingtone, useSaveCallSettings } from '../../calls/api.js';

// Whether the phone service is connected, and what to enter on its side.
function Setup({ setup, canStoreRecordings }) {
  return (
    <section className="max-w-2xl space-y-2 rounded-lg border border-border bg-surface p-4 text-sm">
      <h2 className="font-semibold">Connection to Plivo</h2>
      {setup.isConfigured ? (
        <p className="text-success">Connected: calls can be made and received.</p>
      ) : (
        <p className="text-danger">
          Not set up yet. Missing on the server:{' '}
          <span className="font-mono text-xs">{setup.missing.join(', ')}</span>
        </p>
      )}
      <p className="text-text-muted">
        In the Plivo application of your number, enter the public address of the server followed by
        these paths (method POST):
      </p>
      <dl className="space-y-1">
        {[
          ['Answer URL', setup.inboundPath],
          ['Hangup URL', setup.hangupPath],
        ].map(([label, path]) => (
          <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
            <dt className="text-text-muted">{label}</dt>
            <dd className="font-mono text-xs break-all">{path}</dd>
          </div>
        ))}
      </dl>
      {!canStoreRecordings && (
        <p className="text-danger">
          File storage is not set up, so a recording cannot be kept even when recording is on.
        </p>
      )}
    </section>
  );
}

// The form, started from the saved settings. Rendered with a key, so a save starts it afresh.
function SettingsForm({ settings, canEdit, save }) {
  const [recordingEnabled, setRecordingEnabled] = useState(settings.recordingEnabled);
  const [announcementEnabled, setAnnouncementEnabled] = useState(settings.announcementEnabled);
  const [consentText, setConsentText] = useState(settings.consentText);
  const [defaultInboundUserId, setDefaultInboundUserId] = useState(
    settings.defaultInboundUserId ?? '',
  );
  const [browserCallingEnabled, setBrowserCallingEnabled] = useState(
    settings.browserCallingEnabled,
  );
  const isChanged =
    browserCallingEnabled !== settings.browserCallingEnabled ||
    recordingEnabled !== settings.recordingEnabled ||
    announcementEnabled !== settings.announcementEnabled ||
    consentText !== settings.consentText ||
    defaultInboundUserId !== (settings.defaultInboundUserId ?? '');
  const errors = fieldErrorsFrom(save.error);
  const withoutPhone = settings.users.filter((user) => !user.hasPhone);

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({
          browserCallingEnabled,
          recordingEnabled,
          announcementEnabled,
          consentText: consentText.trim(),
          defaultInboundUserId: defaultInboundUserId || null,
        });
      }}
    >
      <fieldset disabled={!canEdit} className="space-y-2">
        <legend className="mb-1 font-semibold">Calls inside the CRM</legend>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-brand"
            checked={browserCallingEnabled}
            onChange={(event) => setBrowserCallingEnabled(event.target.checked)}
          />
          <span>
            <span className="font-medium">Make and take calls in the browser</span>
            <span className="block text-sm text-text-muted">
              On: the Call button calls from the CRM itself (talk through the computer), and an
              incoming call rings in the CRM and on the person’s phone at the same time. Off: every
              call rings the person’s phone, as before.
            </span>
          </span>
        </label>
        {!settings.browser.isConfigured && (
          <p className="text-sm text-danger">
            Not set up on the server yet. Missing:{' '}
            <span className="font-mono text-xs">{settings.browser.missing.join(', ')}</span>
          </p>
        )}
      </fieldset>

      <fieldset disabled={!canEdit} className="space-y-2">
        <legend className="mb-1 font-semibold">Recording</legend>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-brand"
            checked={recordingEnabled}
            onChange={(event) => setRecordingEnabled(event.target.checked)}
          />
          <span>
            <span className="font-medium">Record calls</span>
            <span className="block text-sm text-text-muted">
              Off: nothing is recorded. On: every call is recorded, and the announcement below is
              said to the person being called before the two sides are joined.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-brand"
            checked={announcementEnabled}
            disabled={!recordingEnabled}
            onChange={(event) => setAnnouncementEnabled(event.target.checked)}
          />
          <span>
            <span className="font-medium">Tell the other side that the call is recorded</span>
            <span className="block text-sm text-text-muted">
              Off: the call is recorded and nothing is said.
            </span>
          </span>
        </label>
        {recordingEnabled && !announcementEnabled && (
          <p role="note" className="rounded-md border border-danger p-3 text-sm text-danger">
            Calls will be recorded without the other person knowing. In India this needs a lawful
            reason and a line in your privacy notice; in some countries and for some customers it is
            not allowed at all. Check with your lawyer before using it with customers.
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">The announcement</span>
          <textarea
            rows={2}
            maxLength={300}
            value={consentText}
            onChange={(event) => setConsentText(event.target.value)}
            className={inputClass}
          />
          {errors.consentText && <span className="text-sm text-danger">{errors.consentText}</span>}
        </label>
      </fieldset>

      <fieldset disabled={!canEdit} className="space-y-2">
        <legend className="mb-1 font-semibold">Incoming calls</legend>
        <p className="text-sm text-text-muted">
          A caller we know rings the person who looks after them (in the CRM and on their phone):
          the owner of their lead, else of the person, else of the company. Anyone else rings the
          person chosen here.
        </p>
        <p className="text-sm text-text-muted">
          When that person does not pick up within 25 seconds, the person chosen here is rung next
          (or, with nobody chosen, their manager). Nobody picks up: a missed call, a notification
          and a call-back task for the first person.
        </p>
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-medium">
            Unknown numbers, and calls nobody picked up, go to
          </span>
          <select
            value={defaultInboundUserId}
            onChange={(event) => setDefaultInboundUserId(event.target.value)}
            className={inputClass}
          >
            <option value="">Nobody (the caller is told nobody is available)</option>
            {settings.users.map((user) => (
              <option key={user.id} value={user.id} disabled={!user.hasPhone}>
                {user.name}
                {!user.hasPhone && ' (no phone number)'}
              </option>
            ))}
          </select>
          {errors.defaultInboundUserId && (
            <span className="text-sm text-danger">{errors.defaultInboundUserId}</span>
          )}
        </label>
        {withoutPhone.length > 0 && (
          <p className="text-sm text-text-muted">
            No phone number yet, so they can neither make nor receive calls:{' '}
            {withoutPhone.map((user) => user.name).join(', ')}. Add it on the Users screen.
          </p>
        )}
      </fieldset>

      <FormError message={save.error?.message} />
      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!isChanged || save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          {isChanged && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setBrowserCallingEnabled(settings.browserCallingEnabled);
                setRecordingEnabled(settings.recordingEnabled);
                setAnnouncementEnabled(settings.announcementEnabled);
                setConsentText(settings.consentText);
                setDefaultInboundUserId(settings.defaultInboundUserId ?? '');
                save.reset();
              }}
            >
              Reset
            </button>
          )}
          {save.isSuccess && !isChanged && (
            <span role="status" className="text-sm text-success">
              Saved. It applies from the next call.
            </span>
          )}
        </div>
      )}
    </form>
  );
}

// The ringtone of calls coming into the browser: Plivo's, or a sound file of our own.
function Ringtone({ ringtone, canEdit }) {
  const { upload, remove } = useRingtone();
  return (
    <section className="max-w-2xl space-y-2 rounded-lg border border-border bg-surface p-4 text-sm">
      <h2 className="font-semibold">Ringtone in the browser</h2>
      {ringtone ? (
        <div className="space-y-2">
          <p>
            Our own: <span className="font-mono text-xs break-all">{ringtone.name}</span>
          </p>
          <audio
            controls
            src={ringtone.url}
            className="w-full max-w-sm"
            aria-label="Our ringtone"
          />
        </div>
      ) : (
        <p className="text-text-muted">Plivo’s ringtone is used.</p>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${secondaryButtonClass} cursor-pointer`}>
            {upload.isPending ? 'Uploading…' : ringtone ? 'Use another sound' : 'Use our own sound'}
            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
              className="sr-only"
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = '';
              }}
            />
          </label>
          {ringtone && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Back to Plivo’s ringtone
            </button>
          )}
          <span className="text-xs text-text-muted">MP3, WAV or OGG, at most 1 MB.</span>
        </div>
      )}
      <FormError message={upload.error?.message ?? remove.error?.message} />
    </section>
  );
}

// Settings → Calls: the connection to the phone service, recording, and incoming calls.
export default function Calls({ canEdit }) {
  // Kept here, not in the form: the form starts afresh after a save, and "Saved" must stay.
  const save = useSaveCallSettings();
  const settings = useCallSettings();
  return (
    <section className="space-y-5">
      <FormError message={settings.error?.message} />
      {settings.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {settings.data && (
        <>
          <Setup
            setup={settings.data.setup}
            canStoreRecordings={settings.data.canStoreRecordings}
          />
          <Ringtone ringtone={settings.data.ringtone} canEdit={canEdit} />
          <SettingsForm
            key={JSON.stringify(settings.data)}
            settings={settings.data}
            canEdit={canEdit}
            save={save}
          />
        </>
      )}
    </section>
  );
}
