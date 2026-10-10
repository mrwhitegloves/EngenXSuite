import { useState } from 'react';
import { Merge, Pencil, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import { TAG_COLOR_LABELS, TagChip } from '../../../components/shared/Tags.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useTagActions, useTags } from '../../../hooks/useTags.js';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand';
const TARGET_LABELS = { account: 'Companies', contact: 'People', opportunity: 'Leads' };

function ColorSelect({ value, onChange, ...props }) {
  return (
    <select
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">No colour</option>
      {Object.entries(TAG_COLOR_LABELS).map(([color, label]) => (
        <option key={color} value={color}>
          {label}
        </option>
      ))}
    </select>
  );
}

// Rename a tag, change its colour, and choose where it is offered.
function EditDialog({ tag, save, onClose }) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? '');
  const [appliesTo, setAppliesTo] = useState(tag.appliesTo);
  const errors = fieldErrorsFrom(save.error);

  function submit(event) {
    event.preventDefault();
    save.mutate(
      { id: tag.id, name: name.trim(), color: color || null, appliesTo },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open title="Edit tag" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Field
          label="Name"
          hint="The new name shows on every record that has this tag."
          error={errors.name}
        >
          {(props) => (
            <input
              {...props}
              value={name}
              maxLength={40}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Colour" error={errors.color}>
          {(props) => <ColorSelect {...props} value={color} onChange={setColor} />}
        </Field>
        <fieldset>
          <legend className="mb-1 font-medium">Offered on</legend>
          <div className="flex flex-wrap gap-4">
            {Object.entries(TARGET_LABELS).map(([target, label]) => (
              <label key={target} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={appliesTo.includes(target)}
                  onChange={(event) =>
                    setAppliesTo(
                      event.target.checked
                        ? [...appliesTo, target]
                        : appliesTo.filter((item) => item !== target),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {errors.appliesTo && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {errors.appliesTo}
            </p>
          )}
        </fieldset>
        <FormError message={Object.keys(errors).length === 0 ? save.error?.message : null} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!name.trim() || appliesTo.length === 0 || save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Merge one tag into another: its records get the other tag, then it is removed.
function MergeDialog({ tag, others, merge, onClose }) {
  const [intoTagId, setIntoTagId] = useState('');
  return (
    <Dialog open title={`Merge “${tag.name}” into another tag`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          merge.mutate({ id: tag.id, intoTagId }, { onSuccess: onClose });
        }}
      >
        <p className="text-text-muted">
          Every record with <strong className="text-text">{tag.name}</strong> gets the tag you
          choose here, and <strong className="text-text">{tag.name}</strong> is removed. This cannot
          be undone.
        </p>
        <Field label="Merge into">
          {(props) => (
            <select
              {...props}
              value={intoTagId}
              onChange={(event) => setIntoTagId(event.target.value)}
              className={inputClass}
            >
              <option value="">Choose a tag</option>
              {others.map((other) => (
                <option key={other.id} value={other.id}>
                  {other.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <FormError message={merge.error?.message} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!intoTagId || merge.isPending}
          >
            {merge.isPending ? 'Merging…' : 'Merge'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Settings → Tags: the labels the team puts on companies and people.
export default function Tags({ canEdit }) {
  const tags = useTags({ withUses: true });
  const actions = useTagActions();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const rows = tags.data ?? [];

  function add(event) {
    event.preventDefault();
    actions.create.mutate(
      { name: newName.trim(), ...(newColor ? { color: newColor } : {}) },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor('');
        },
      },
    );
  }

  return (
    <section className="space-y-3">
      <p className="max-w-2xl text-sm text-text-muted">
        Tags are short labels, for example “Key account” or “Exhibition 2026”. Anyone who may edit a
        company or a person can put these tags on it; only this screen changes the list.
      </p>

      {canEdit && (
        <form onSubmit={add} className="flex flex-wrap items-start gap-2">
          <div>
            <input
              aria-label="New tag name"
              placeholder="New tag name"
              value={newName}
              maxLength={40}
              onChange={(event) => setNewName(event.target.value)}
              className={`${inputClass} w-64`}
            />
            {actions.create.error && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {actions.create.error.message}
              </p>
            )}
          </div>
          <div className="w-36">
            <ColorSelect aria-label="New tag colour" value={newColor} onChange={setNewColor} />
          </div>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!newName.trim() || actions.create.isPending}
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </form>
      )}

      <FormError message={tags.error?.message} />
      {tags.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {tags.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          No tags yet.{canEdit && ' Add the first one above.'}
        </p>
      )}

      {rows.length > 0 && (
        <ul
          aria-label="Tags"
          className="divide-y divide-border rounded-lg border border-border bg-surface"
        >
          {rows.map((tag) => (
            <li key={tag.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="min-w-40 flex-1">
                <TagChip tag={tag} />
              </span>
              <span className="text-sm text-text-muted">
                {tag.appliesTo.map((target) => TARGET_LABELS[target]).join(', ')} · on {tag.uses}{' '}
                {tag.uses === 1 ? 'record' : 'records'}
              </span>
              {canEdit && (
                <span className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={rowButton}
                    aria-label={`Edit ${tag.name}`}
                    onClick={() => {
                      actions.update.reset();
                      setEditTarget(tag);
                    }}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className={rowButton}
                    aria-label={`Merge ${tag.name}`}
                    disabled={rows.length < 2}
                    onClick={() => {
                      actions.merge.reset();
                      setMergeTarget(tag);
                    }}
                  >
                    <Merge size={13} aria-hidden="true" />
                    Merge
                  </button>
                  <button
                    type="button"
                    className={rowButton}
                    aria-label={`Delete ${tag.name}`}
                    onClick={() => {
                      actions.remove.reset();
                      setDeleteTarget(tag);
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {editTarget && (
        <EditDialog
          key={editTarget.id}
          tag={editTarget}
          save={actions.update}
          onClose={() => setEditTarget(null)}
        />
      )}
      {mergeTarget && (
        <MergeDialog
          key={mergeTarget.id}
          tag={mergeTarget}
          others={rows.filter((tag) => tag.id !== mergeTarget.id)}
          merge={actions.merge}
          onClose={() => setMergeTarget(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this tag?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> will be taken off {deleteTarget?.uses}{' '}
          {deleteTarget?.uses === 1 ? 'record' : 'records'} and removed from the list. The records
          themselves stay.
        </p>
      </ConfirmDialog>
    </section>
  );
}
