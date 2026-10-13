import { useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import DocumentPicker from '../../documents/components/DocumentPicker.jsx';
import { useBundles, useSendingActions } from '../api.js';

const CHANNELS = [
  ['email', 'Mail (from my own Gmail)'],
  ['whatsapp', 'WhatsApp (an approved template)'],
];

/**
 * Make a bulk sending: to which bundle, by mail or WhatsApp, what it says, and how many
 * seconds lie between one person and the next. It is saved as a draft: nothing goes out until
 * it is started on its own page.
 * @param {{ bundle?: { id: string, name: string }, onClose: () => void,
 *           onMade: (id: string) => void }} props
 */
export default function NewSendingDialog({ bundle, onClose, onMade }) {
  const bundles = useBundles({ pageSize: 100 }, !bundle);
  const { create } = useSendingActions();
  const [isPicking, setIsPicking] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bundleId: bundle?.id ?? '',
    channel: 'email',
    gapSeconds: 30,
    writeMode: 'ai',
    brief: '',
    subject: '',
    body: '',
    minDaysBeforeReminder: 3,
    attachments: [],
    templateName: '',
    templateLanguage: 'en',
    templateParams: '',
  });
  const errors = fieldErrorsFrom(create.error);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const isMail = form.channel === 'email';
  const isReady =
    form.name.trim() &&
    form.bundleId &&
    (isMail
      ? form.writeMode === 'ai'
        ? form.brief.trim().length >= 10
        : form.subject.trim() && form.body.trim()
      : form.templateName.trim());

  function submit(event) {
    event.preventDefault();
    const base = {
      name: form.name.trim(),
      bundleId: form.bundleId,
      channel: form.channel,
      gapSeconds: Number(form.gapSeconds),
    };
    const body = isMail
      ? {
          ...base,
          writeMode: form.writeMode,
          ...(form.brief.trim() ? { brief: form.brief.trim() } : {}),
          ...(form.subject.trim() ? { subject: form.subject.trim() } : {}),
          ...(form.writeMode === 'fixed' ? { body: form.body.trim() } : {}),
          minDaysBeforeReminder: Number(form.minDaysBeforeReminder),
          ...(form.attachments.length
            ? {
                attachments: form.attachments.map(({ url, filename, mimeType }) => ({
                  url,
                  filename,
                  mimeType,
                })),
              }
            : {}),
        }
      : {
          ...base,
          templateName: form.templateName.trim(),
          templateLanguage: form.templateLanguage.trim(),
          templateParams: form.templateParams
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        };
    create.mutate(body, { onSuccess: (payload) => onMade(payload.data.id) });
  }

  return (
    <Dialog open wide title="New bulk sending" onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name of this sending" error={errors.name}>
            {(props) => (
              <input
                {...props}
                autoFocus
                maxLength={120}
                value={form.name}
                placeholder="For example: OEE dashboard, October"
                onChange={set('name')}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="To the bundle" error={errors.bundleId}>
            {(props) =>
              bundle ? (
                <input {...props} value={bundle.name} disabled className={inputClass} />
              ) : (
                <select
                  {...props}
                  value={form.bundleId}
                  onChange={set('bundleId')}
                  className={inputClass}
                >
                  <option value="">Choose a bundle</option>
                  {(bundles.data?.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.memberCount})
                    </option>
                  ))}
                </select>
              )
            }
          </Field>
          <Field label="How" error={errors.channel}>
            {(props) => (
              <select
                {...props}
                value={form.channel}
                onChange={set('channel')}
                className={inputClass}
              >
                {CHANNELS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="Seconds between one and the next"
            error={errors.gapSeconds}
            hint="5 to 3600. A longer gap looks less like a machine."
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min={5}
                max={3600}
                value={form.gapSeconds}
                onChange={set('gapSeconds')}
                className={inputClass}
              />
            )}
          </Field>
        </div>

        {isMail ? (
          <>
            <fieldset className="space-y-1 text-sm">
              <legend className="mb-1 font-medium">Who writes the mail</legend>
              {[
                [
                  'ai',
                  'The AI writes each mail for its reader (their name, their company, what was said before)',
                ],
                ['fixed', 'The same text for everyone'],
              ].map(([value, label]) => (
                <label key={value} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="writeMode"
                    className="mt-0.5 accent-brand"
                    checked={form.writeMode === value}
                    onChange={() => setForm({ ...form, writeMode: value })}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <Field
              label="What the mail is about"
              error={errors.brief}
              hint={
                form.writeMode === 'ai'
                  ? 'The AI writes from this. Say what you offer and what you want the reader to do. No price or date it cannot know.'
                  : 'Optional. Used for the reminders the AI writes to people you wrote to before.'
              }
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  maxLength={4000}
                  value={form.brief}
                  placeholder="For example: tell them about our new OEE dashboard for press shops and offer a free 30 minute demo."
                  onChange={set('brief')}
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              label={
                form.writeMode === 'ai' ? 'Subject (optional: the AI stays close to it)' : 'Subject'
              }
              error={errors.subject}
            >
              {(props) => (
                <input
                  {...props}
                  maxLength={300}
                  value={form.subject}
                  onChange={set('subject')}
                  className={inputClass}
                />
              )}
            </Field>
            {form.writeMode === 'fixed' && (
              <Field
                label="Text"
                error={errors.body}
                hint="{{name}} becomes the reader’s name, {{company}} their company."
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={7}
                    maxLength={8000}
                    value={form.body}
                    placeholder={'Dear {{name}},\n\n…\n\nRegards,\nYour name'}
                    onChange={set('body')}
                    className={inputClass}
                  />
                )}
              </Field>
            )}
            <Field
              label="Days without an answer before a reminder"
              error={errors.minDaysBeforeReminder}
              hint="Someone you wrote to more recently is skipped. Someone who wrote to YOU last is always skipped."
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={0}
                  max={60}
                  value={form.minDaysBeforeReminder}
                  onChange={set('minDaysBeforeReminder')}
                  className={`${inputClass} sm:w-32`}
                />
              )}
            </Field>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  aria-expanded={isPicking}
                  onClick={() => setIsPicking((value) => !value)}
                >
                  <Paperclip size={16} aria-hidden="true" />
                  Files from Documents (for every mail)
                </button>
                {form.attachments.map((file) => (
                  <span
                    key={file.url}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                  >
                    {file.filename}
                    <button
                      type="button"
                      aria-label={`Remove ${file.filename}`}
                      onClick={() =>
                        setForm({
                          ...form,
                          attachments: form.attachments.filter((item) => item.url !== file.url),
                        })
                      }
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
              {isPicking && (
                <DocumentPicker
                  chosen={form.attachments}
                  onPick={(file) =>
                    form.attachments.length < 5 &&
                    setForm({ ...form, attachments: [...form.attachments, file] })
                  }
                />
              )}
            </div>
          </>
        ) : (
          <>
            <p className="rounded-md border border-border bg-page p-2 text-sm text-text-muted">
              WhatsApp lets a business write first only with a template that Meta has approved. Type
              its name exactly as in Meta. Meta charges for each such message.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Template name" error={errors.templateName}>
                {(props) => (
                  <input
                    {...props}
                    value={form.templateName}
                    placeholder="for_example_first_contact"
                    onChange={set('templateName')}
                    className={inputClass}
                  />
                )}
              </Field>
              <Field label="Language of the template" error={errors.templateLanguage}>
                {(props) => (
                  <input
                    {...props}
                    value={form.templateLanguage}
                    placeholder="en, en_US, hi"
                    onChange={set('templateLanguage')}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
            <Field
              label="Texts for the template’s places {{1}}, {{2}} …"
              error={errors.templateParams}
              hint="One per line, in order. {{name}} becomes the reader’s name, {{company}} their company. Leave empty when the template has no places."
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  value={form.templateParams}
                  placeholder={'{{name}}\n{{company}}'}
                  onChange={set('templateParams')}
                  className={inputClass}
                />
              )}
            </Field>
          </>
        )}

        <FormError message={Object.keys(errors).length === 0 ? create.error?.message : null} />
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-xs text-text-muted">
            Saved as a draft. Nothing goes out until you press Start on the next screen.
          </span>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!isReady || create.isPending}
          >
            {create.isPending ? 'Saving…' : 'Save the draft'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
