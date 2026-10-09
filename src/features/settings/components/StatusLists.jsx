import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { useStatusList, useStatusListActions } from '../api.js';

const LISTS = [
  {
    key: 'account-statuses',
    label: 'Account statuses',
    help: 'Where a company stands, for example Prospect or Customer.',
  },
  {
    key: 'lead-statuses',
    label: 'Lead statuses',
    help: 'Where a lead stands in day-to-day follow-up, for example DNP or Follow-up. A lead also has a pipeline stage; the two are separate.',
  },
];

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand';
const iconButton =
  'rounded-md border border-border p-1 text-text-muted hover:border-text-muted hover:text-text disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand';

// One name field in a small dialog: used to rename a status.
function RenameDialog({ status, onClose, onSave, isBusy, error }) {
  const [name, setName] = useState(status.name);
  const fieldError = fieldErrorsFrom(error).name ?? error?.message;
  return (
    <Dialog open title="Rename status" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name.trim());
        }}
      >
        <Field
          label="Name"
          hint="The new name shows on every record that has this status."
          error={fieldError}
        >
          {(props) => (
            <input
              {...props}
              value={name}
              maxLength={60}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!name.trim() || name.trim() === status.name || isBusy}
          >
            {isBusy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// One managed list: its statuses in order, with the actions on each.
function StatusList({ list, canEdit }) {
  const statuses = useStatusList(list.key);
  const actions = useStatusListActions(list.key);
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = statuses.data ?? [];
  const isBusy = Object.values(actions).some((action) => action.isPending);
  // Errors of the row buttons (switch off, make default, move). Dialogs show their own.
  const rowError = actions.update.error?.message ?? actions.reorder.error?.message;

  function move(index, step) {
    const ids = rows.map((status) => status.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    actions.reorder.mutate(ids);
  }

  function add(event) {
    event.preventDefault();
    actions.create.mutate({ name: newName.trim() }, { onSuccess: () => setNewName('') });
  }

  return (
    <section className="space-y-3">
      <p className="max-w-2xl text-sm text-text-muted">{list.help}</p>

      {canEdit && (
        <form onSubmit={add} className="flex flex-wrap items-start gap-2">
          <div>
            <input
              aria-label={`New ${list.label.toLowerCase().replace(/es$/, '')}`}
              placeholder="New status name"
              value={newName}
              maxLength={60}
              onChange={(event) => setNewName(event.target.value)}
              className={`${inputClass} w-64`}
            />
            {actions.create.error && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {actions.create.error.message}
              </p>
            )}
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

      <FormError message={statuses.error?.message ?? (renameTarget ? null : rowError)} />
      {statuses.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {statuses.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          No statuses yet. Add the first one above; it becomes the default.
        </p>
      )}

      {rows.length > 0 && (
        <ul
          aria-label={list.label}
          className="divide-y divide-border rounded-lg border border-border bg-surface"
        >
          {rows.map((status, index) => (
            <li key={status.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              {canEdit && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={`Move ${status.name} up`}
                    disabled={index === 0 || isBusy}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={`Move ${status.name} down`}
                    disabled={index === rows.length - 1 || isBusy}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </button>
                </span>
              )}

              <span
                className={`min-w-40 flex-1 font-medium ${status.isActive ? '' : 'text-text-muted line-through'}`}
              >
                {status.name}
              </span>
              {status.isDefault && (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-text">
                  Default
                </span>
              )}
              {!status.isActive && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                  Switched off
                </span>
              )}

              {canEdit && (
                <span className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={rowButton}
                    disabled={isBusy}
                    onClick={() => {
                      actions.update.reset();
                      setRenameTarget(status);
                    }}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Rename
                  </button>
                  {!status.isDefault && status.isActive && (
                    <button
                      type="button"
                      className={rowButton}
                      disabled={isBusy}
                      onClick={() => actions.update.mutate({ id: status.id, isDefault: true })}
                    >
                      Make default
                    </button>
                  )}
                  {!status.isDefault && (
                    <button
                      type="button"
                      className={rowButton}
                      disabled={isBusy}
                      onClick={() =>
                        actions.update.mutate({ id: status.id, isActive: !status.isActive })
                      }
                    >
                      {status.isActive ? 'Switch off' : 'Switch on'}
                    </button>
                  )}
                  {!status.isDefault && (
                    <button
                      type="button"
                      className={rowButton}
                      aria-label={`Delete ${status.name}`}
                      disabled={isBusy}
                      onClick={() => {
                        actions.remove.reset();
                        setDeleteTarget(status);
                      }}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      Delete
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-text-muted">
        A status that records already use cannot be deleted. Switch it off instead: it leaves the
        pickers and stays on those records. New records get the default status.
      </p>

      {renameTarget && (
        <RenameDialog
          key={renameTarget.id}
          status={renameTarget}
          isBusy={actions.update.isPending}
          error={actions.update.error}
          onClose={() => setRenameTarget(null)}
          onSave={(name) =>
            actions.update.mutate(
              { id: renameTarget.id, name },
              { onSuccess: () => setRenameTarget(null) },
            )
          }
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this status?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> will be removed from the list. This works only while
          no record has this status.
        </p>
      </ConfirmDialog>
    </section>
  );
}

// Settings → Statuses: the status lists an administrator manages, like tags.
export default function StatusLists({ canEdit }) {
  const [listKey, setListKey] = useState(LISTS[0].key);
  const list = LISTS.find((item) => item.key === listKey);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Status lists" className="flex flex-wrap gap-2">
        {LISTS.map((item) => {
          const isSelected = item.key === listKey;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setListKey(item.key)}
              className={[
                'rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand',
                isSelected
                  ? 'border-brand bg-brand-soft text-brand-text'
                  : 'border-border bg-surface hover:border-text-muted',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <StatusList key={list.key} list={list} canEdit={canEdit} />
    </div>
  );
}
