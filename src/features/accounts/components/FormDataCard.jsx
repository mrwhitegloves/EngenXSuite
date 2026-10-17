import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useUpdateAccount } from '../api.js';

const MAX_FIELDS = 50;

/** "what_is_your_role_in_the_organization?" → "What is your role in the organization?" */
export function fieldLabel(key) {
  const words = String(key).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
}

// The window to add, change and remove the company's free fields.
function FormDataDialog({ accountId, formData, onClose }) {
  const queryClient = useQueryClient();
  const save = useUpdateAccount();
  const [rows, setRows] = useState(() =>
    Object.entries(formData).map(([key, value], index) => ({ id: index, key, value })),
  );
  const [nextId, setNextId] = useState(rows.length);
  const setRow = (id, change) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, ...change } : row)));
  const names = rows.map((row) => row.key.trim()).filter(Boolean);
  const doubled = names.find((name, index) => names.indexOf(name) !== index);
  const badName = names.find((name) => name.includes('.') || name.startsWith('$'));

  function submit() {
    const form_data = Object.fromEntries(
      rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
    );
    save.mutate(
      { id: accountId, form_data },
      {
        onSuccess: () => {
          // The lead pages show the company's fields too.
          queryClient.invalidateQueries({ queryKey: ['opportunities'] });
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open
      wide
      title="Form answers and own fields"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={save.isPending || Boolean(doubled) || Boolean(badName)}
            onClick={submit}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-text-muted">
          The answers of a lead form, and any field you add yourself. An empty value removes the
          field.
        </p>
        {rows.length === 0 && <p className="text-sm text-text-muted">No field yet.</p>}
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                aria-label="Field name"
                placeholder="Field name, e.g. Number of plants"
                value={row.key}
                maxLength={150}
                onChange={(event) => setRow(row.id, { key: event.target.value })}
                className={inputClass}
              />
              <input
                aria-label={`Value of ${row.key || 'the field'}`}
                placeholder="Value"
                value={row.value}
                maxLength={1000}
                onChange={(event) => setRow(row.id, { value: event.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                aria-label={`Remove ${row.key || 'this field'}`}
                onClick={() => setRows(rows.filter((item) => item.id !== row.id))}
                className="rounded-md p-2 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {rows.length < MAX_FIELDS && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              setRows([...rows, { id: nextId, key: '', value: '' }]);
              setNextId(nextId + 1);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Add a field
          </button>
        )}
        {doubled && <p className="text-sm text-danger">“{doubled}” is there twice.</p>}
        {badName && (
          <p className="text-sm text-danger">A field name may not contain “.” or start with “$”.</p>
        )}
        <FormError message={save.error?.message} />
      </div>
    </Dialog>
  );
}

/**
 * The company's free fields (form_data): the answers of a lead form that fill no CRM field, and
 * fields the team adds. Shown on the company and on its leads; changed on the company.
 * @param {{ accountId: string, formData: Record<string, string>, canEdit: boolean,
 *           title?: string }} props
 */
export default function FormDataCard({
  accountId,
  formData,
  canEdit,
  title = 'Form answers and own fields',
}) {
  const [isEditing, setIsEditing] = useState(false);
  const entries = Object.entries(formData ?? {});
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted uppercase">
          <ClipboardList size={14} aria-hidden="true" />
          {title}
        </h2>
        {canEdit && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand"
            onClick={() => setIsEditing(true)}
          >
            {entries.length ? (
              <Pencil size={12} aria-hidden="true" />
            ) : (
              <Plus size={12} aria-hidden="true" />
            )}
            {entries.length ? 'Change' : 'Add a field'}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing yet.</p>
      ) : (
        <dl className="space-y-2 text-sm">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="grid gap-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-3"
            >
              <dt className="text-text-muted break-words">{fieldLabel(key)}</dt>
              <dd className="break-words whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {isEditing && (
        <FormDataDialog
          accountId={accountId}
          formData={formData ?? {}}
          onClose={() => setIsEditing(false)}
        />
      )}
    </section>
  );
}
