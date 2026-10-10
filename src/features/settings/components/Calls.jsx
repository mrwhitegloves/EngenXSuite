import { useState } from 'react';
import {
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCallSettings, useSaveCallSettings } from '../../calls/api.js';

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
  const [consentText, setConsentText] = useState(settings.consentText);
  const [defaultInboundUserId, setDefaultInboundUserId] = useState(
    settings.defaultInboundUserId ?? '',
  );
  const isChanged =
    recordingEnabled !== settings.recordingEnabled ||
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
          recordingEnabled,
          consentText: consentText.trim(),
          defaultInboundUserId: defaultInboundUserId || null,
        });
      }}
    >
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
          A caller we know rings the phone of the person who looks after them: the owner of their
          lead, else of the person, else of the company. Anyone else rings the person chosen here.
        </p>
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-medium">Calls from unknown numbers go to</span>
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
                setRecordingEnabled(settings.recordingEnabled);
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
