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

/**
 * One small form dialog for the simple records under an account (a person, a plant, a machine).
 * It is told its fields; it keeps their text, shows the server's message at the field that
 * caused it, and on save sends only what changed (or, for a new record, only what was filled).
 *
 * A field: { name, label, type?: 'text'|'number'|'select'|'checkbox'|'textarea'|'email'|'tel',
 *            choices?: [value, label][], emptyLabel?, hint?, wide?: boolean, required?: boolean,
 *            serverName?: string }   serverName: where the server reports this field's error
 *
 * @param {{ title: string, fields: object[], initial: object, isNew: boolean,
 *           toBody: (values: object) => object, save: object, saveLabel: string,
 *           onSave: (body: object) => void, onClose: () => void, wide?: boolean }} props
 *        save: the mutation (for isPending and error); toBody turns the form's text into the
 *        API's shape. onSave gets the changed part only.
 */
export default function RecordFormDialog({
  title,
  fields,
  initial,
  isNew,
  toBody,
  save,
  saveLabel,
  onSave,
  onClose,
  wide = false,
}) {
  const [values, setValues] = useState(initial);
  const errors = fieldErrorsFrom(save.error);
  const hasFieldErrors = fields.some((field) => errors[field.serverName ?? field.name]);
  const missingRequired = fields.some(
    (field) => field.required && !String(values[field.name] ?? '').trim(),
  );

  function submit(event) {
    event.preventDefault();
    const body = toBody(values);
    if (isNew) {
      onSave(body);
      return;
    }
    const before = toBody(initial);
    const changed = Object.fromEntries(
      Object.entries(body).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key]),
      ),
    );
    if (Object.keys(changed).length === 0) onClose();
    else onSave(changed);
  }

  const set = (name, value) => setValues({ ...values, [name]: value });

  function control(field, props) {
    const value = values[field.name];
    if (field.type === 'select') {
      return (
        <select
          {...props}
          value={value}
          onChange={(event) => set(field.name, event.target.value)}
          className={inputClass}
        >
          <option value="">{field.emptyLabel ?? 'Not set'}</option>
          {field.choices.map(([choice, label]) => (
            <option key={choice} value={choice}>
              {label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === 'textarea') {
      return (
        <textarea
          {...props}
          rows={3}
          value={value}
          onChange={(event) => set(field.name, event.target.value)}
          className={inputClass}
        />
      );
    }
    return (
      <input
        {...props}
        type={field.type === 'number' ? 'text' : (field.type ?? 'text')}
        inputMode={field.type === 'number' ? 'numeric' : undefined}
        value={value}
        onChange={(event) => set(field.name, event.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
    );
  }

  return (
    <Dialog open wide={wide} title={title} onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={submit}>
        <div className={`grid gap-3 ${wide ? 'sm:grid-cols-2' : ''}`}>
          {fields.map((field) =>
            field.type === 'checkbox' ? (
              <label
                key={field.name}
                className={`flex items-start gap-2 ${field.wide ? 'sm:col-span-2' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(event) => set(field.name, event.target.checked)}
                  className="mt-1 size-4 accent-brand"
                />
                <span>
                  <span className="font-medium">{field.label}</span>
                  {field.hint && (
                    <span className="block text-sm text-text-muted">{field.hint}</span>
                  )}
                </span>
              </label>
            ) : (
              <div key={field.name} className={field.wide ? 'sm:col-span-2' : ''}>
                <Field
                  label={field.label}
                  hint={field.hint}
                  error={errors[field.serverName ?? field.name]}
                >
                  {(props) => control(field, props)}
                </Field>
              </div>
            ),
          )}
        </div>

        <FormError
          message={
            hasFieldErrors
              ? 'Some fields need a correction. They are marked above.'
              : save.error?.message
          }
        />

        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={missingRequired || save.isPending}
          >
            {save.isPending ? 'Saving…' : saveLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Helpers for toBody: what an empty text or a number field means for the API. */
export const textOrNull = (value) => (String(value ?? '').trim() === '' ? null : value);
export const numberOrNull = (value) =>
  String(value ?? '').trim() === '' ? null : Number(String(value).trim());

/** For a new record: leave out everything that was not filled in. */
export function onlyFilled(body) {
  const isEmpty = (value) =>
    value === null || value === '' || (Array.isArray(value) && value.length === 0);
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (isEmpty(value)) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const inner = onlyFilled(value);
      if (Object.keys(inner).length > 0) result[key] = inner;
    } else {
      result[key] = value;
    }
  }
  return result;
}
