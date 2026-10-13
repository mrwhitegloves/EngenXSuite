import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useMeetingTypeActions, useMeetingTypes } from '../../calendar/api.js';
import { MODE_LABELS } from '../../calendar/dates.js';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand';

// Add a kind of meeting, or change one.
function TypeDialog({ type, save, onClose }) {
  const [form, setForm] = useState({
    name: type?.name ?? '',
    mode: type?.mode ?? 'online',
    durationMinutes: type?.durationMinutes ?? 30,
    isBookable: type?.isBookable ?? false,
    isActive: type?.isActive ?? true,
  });
  const errors = fieldErrorsFrom(save.error);

  function submit(event) {
    event.preventDefault();
    const body = { ...form, name: form.name.trim(), durationMinutes: Number(form.durationMinutes) };
    save.mutate(type ? { id: type.id, ...body } : body, { onSuccess: onClose });
  }

  return (
    <Dialog open title={type ? 'Edit meeting type' : 'New meeting type'} onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={submit}>
        <Field label="Name" error={errors.name}>
          {(props) => (
            <input
              {...props}
              autoFocus
              maxLength={80}
              value={form.name}
              placeholder="For example: Product demo"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="How it is held" error={errors.mode}>
            {(props) => (
              <select
                {...props}
                value={form.mode}
                onChange={(event) => setForm({ ...form, mode: event.target.value })}
                className={inputClass}
              >
                {Object.entries(MODE_LABELS).map(([mode, label]) => (
                  <option key={mode} value={mode}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Usual length (minutes)" error={errors.durationMinutes}>
            {(props) => (
              <input
                {...props}
                type="number"
                min={15}
                max={480}
                step={15}
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                className={inputClass}
              />
            )}
          </Field>
        </div>
        {[
          ['isBookable', 'Customers can book it on a public booking page'],
          ['isActive', 'In use (switched off: no longer offered for new meetings)'],
        ].map(([key, words]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
            />
            {words}
          </label>
        ))}
        <FormError message={Object.keys(errors).length === 0 ? save.error?.message : null} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!form.name.trim() || save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Settings → Meeting types: the kinds of meeting the team plans, and which of them customers
// can book on a public booking page.
export default function MeetingTypes({ canEdit }) {
  const types = useMeetingTypes();
  const actions = useMeetingTypeActions();
  const [editing, setEditing] = useState(null); // a type, or 'new'
  const [deleting, setDeleting] = useState(null);
  const open = (target) => {
    actions.create.reset();
    actions.update.reset();
    setEditing(target);
  };

  return (
    <section aria-label="Meeting types" className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted">
          The kinds of meeting your team plans. A bookable kind can be offered on a person’s public
          booking page.
        </p>
        {canEdit && (
          <button type="button" className={primaryButtonClass} onClick={() => open('new')}>
            <Plus size={16} aria-hidden="true" />
            New meeting type
          </button>
        )}
      </div>
      <FormError message={types.error?.message} />
      {types.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden">
        {(types.data ?? []).map((type) => (
          <li key={type.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span
                className={`font-medium ${type.isActive ? '' : 'text-text-muted line-through'}`}
              >
                {type.name}
              </span>
              <span className="block text-xs text-text-muted">
                {MODE_LABELS[type.mode]} · {type.durationMinutes} minutes
                {type.isBookable && ' · customers can book it'}
                {!type.isActive && ' · switched off'}
              </span>
            </span>
            {canEdit && (
              <>
                <button type="button" className={rowButton} onClick={() => open(type)}>
                  <Pencil size={12} aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${type.name}`}
                  className={rowButton}
                  onClick={() => {
                    actions.remove.reset();
                    setDeleting(type);
                  }}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <TypeDialog
          type={editing === 'new' ? null : editing}
          save={editing === 'new' ? actions.create : actions.update}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this meeting type?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleting(null)}
        onConfirm={() => actions.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      >
        <p>
          <strong>{deleting?.name}</strong> will be removed. A type that meetings use cannot be
          deleted: switch it off instead.
        </p>
      </ConfirmDialog>
    </section>
  );
}
