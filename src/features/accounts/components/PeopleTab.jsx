import { useState } from 'react';
import { Mail, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { TagChips } from '../../../components/shared/Tags.jsx';
import { FormError, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useTagsFor } from '../../../hooks/useTags.js';
import { STAKEHOLDER_ROLE_LABELS } from '../accountForm.js';
import { useAccountContacts, useContactActions } from '../api.js';
import RecordFormDialog, { numberOrNull, onlyFilled, textOrNull } from './RecordFormDialog.jsx';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const oneToFive = [1, 2, 3, 4, 5].map((level) => [String(level), `${level} of 5`]);

const FIELDS = [
  { name: 'name', label: 'Name', required: true, wide: true },
  { name: 'designation', label: 'Designation' },
  { name: 'department', label: 'Department' },
  { name: 'phone_number', label: 'Phone', type: 'tel' },
  { name: 'alt_phone_number', label: 'Other phone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'linkedinUrl', label: 'LinkedIn' },
  {
    name: 'stakeholderRole',
    label: 'Role in decisions',
    type: 'select',
    choices: Object.entries(STAKEHOLDER_ROLE_LABELS),
    emptyLabel: 'Not known',
  },
  { name: 'decisionPower', label: 'Decision power', type: 'select', choices: oneToFive },
  { name: 'technicalInfluence', label: 'Technical influence', type: 'select', choices: oneToFive },
  {
    name: 'commercialInfluence',
    label: 'Commercial influence',
    type: 'select',
    choices: oneToFive,
  },
  {
    name: 'relationshipStrength',
    label: 'Our relationship',
    type: 'select',
    choices: oneToFive,
  },
];
// Consent can only be recorded for a person who exists, so these two show when editing.
const CONSENT_FIELDS = [
  {
    name: 'whatsappOptIn',
    label: 'Agreed to WhatsApp messages',
    type: 'checkbox',
    hint: 'Tick only when this person said yes. The time is recorded.',
    wide: true,
    serverName: 'consent.whatsappOptIn',
  },
  {
    name: 'doNotCall',
    label: 'Do not call',
    type: 'checkbox',
    hint: 'This person asked not to be phoned.',
    wide: true,
    serverName: 'consent.doNotCall',
  },
];

const text = (value) => (value === null || value === undefined ? '' : String(value));

function toForm(contact) {
  const form = Object.fromEntries(FIELDS.map((field) => [field.name, text(contact?.[field.name])]));
  return {
    ...form,
    tagIds: (contact?.tags ?? []).map((tag) => tag.id),
    whatsappOptIn: contact?.consent?.whatsappOptIn ?? false,
    doNotCall: contact?.consent?.doNotCall ?? false,
  };
}

function toBody(values) {
  return {
    name: values.name.trim(),
    designation: textOrNull(values.designation),
    department: textOrNull(values.department),
    // Sent as typed; the server stores phone numbers in one form.
    phone_number: textOrNull(values.phone_number),
    alt_phone_number: textOrNull(values.alt_phone_number),
    email: textOrNull(values.email),
    linkedinUrl: textOrNull(values.linkedinUrl),
    stakeholderRole: textOrNull(values.stakeholderRole),
    decisionPower: numberOrNull(values.decisionPower),
    technicalInfluence: numberOrNull(values.technicalInfluence),
    commercialInfluence: numberOrNull(values.commercialInfluence),
    relationshipStrength: numberOrNull(values.relationshipStrength),
    tagIds: values.tagIds,
    consent: { whatsappOptIn: values.whatsappOptIn, doNotCall: values.doNotCall },
  };
}

// The People tab of Account 360: everyone we know at this company.
export default function PeopleTab({ accountId }) {
  const can = useCan();
  const contacts = useAccountContacts(accountId);
  const actions = useContactActions(accountId);
  const tagField = { name: 'tagIds', label: 'Tags', type: 'tags', tags: useTagsFor('contact') };
  // null = closed, 'new' = the add form, or the contact being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = contacts.data ?? [];
  const isNew = formTarget === 'new';
  const save = isNew ? actions.create : actions.update;

  const columns = [
    {
      key: 'name',
      header: 'Person',
      render: (row) => (
        <>
          <p className="font-medium">{row.name}</p>
          <p className="text-text-muted">
            {[row.designation, row.department].filter(Boolean).join(' · ') || '—'}
          </p>
          <TagChips tags={row.tags} className="mt-1" />
        </>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => STAKEHOLDER_ROLE_LABELS[row.stakeholderRole] ?? '—',
    },
    {
      key: 'reach',
      header: 'Phone and email',
      render: (row) => (
        <div className="space-y-0.5">
          {row.phone_number && (
            <a
              href={`tel:${row.phone_number}`}
              className="flex items-center gap-1 hover:text-brand-text"
            >
              <Phone size={13} aria-hidden="true" />
              {row.phone_number}
            </a>
          )}
          {row.email && (
            <a
              href={`mailto:${row.email}`}
              className="flex items-center gap-1 break-all hover:text-brand-text"
            >
              <Mail size={13} aria-hidden="true" />
              {row.email}
            </a>
          )}
          {!row.phone_number && !row.email && '—'}
        </div>
      ),
    },
    {
      key: 'consent',
      header: 'Allowed',
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <p className={row.consent.whatsappOptIn ? 'text-success' : 'text-text-muted'}>
            {row.consent.whatsappOptIn ? 'WhatsApp: yes' : 'WhatsApp: not agreed'}
          </p>
          {row.consent.doNotCall && <p className="text-danger">Do not call</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('contacts', 'edit') && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Edit ${row.name}`}
              onClick={() => {
                actions.update.reset();
                setFormTarget(row);
              }}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          )}
          {can('contacts', 'delete') && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Delete ${row.name}`}
              onClick={() => {
                actions.remove.reset();
                setDeleteTarget(row);
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">People at this company</h2>
        {can('contacts', 'create') && (
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              actions.create.reset();
              setFormTarget('new');
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Add person
          </button>
        )}
      </div>

      <FormError message={contacts.error?.message} />
      {contacts.isPending && (
        <p role="status" className="text-text-muted">
          Loading people…
        </p>
      )}
      {contacts.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title="No people yet"
          description="Add the people you talk to at this company: plant heads, purchase, IT."
        />
      )}
      {rows.length > 0 && <DataTable caption="People" columns={columns} rows={rows} />}

      {formTarget && (
        <RecordFormDialog
          key={isNew ? 'new' : formTarget.id}
          wide
          title={isNew ? 'Add person' : `Edit ${formTarget.name}`}
          fields={isNew ? [...FIELDS, tagField] : [...FIELDS, tagField, ...CONSENT_FIELDS]}
          initial={toForm(isNew ? null : formTarget)}
          isNew={isNew}
          toBody={toBody}
          save={save}
          saveLabel={isNew ? 'Add person' : 'Save changes'}
          onClose={() => setFormTarget(null)}
          onSave={(body) => {
            // A new person: only what was filled in, and no consent (nothing is assumed).
            const { consent, ...rest } = body;
            const payload = isNew
              ? onlyFilled(rest)
              : { id: formTarget.id, ...rest, ...(consent ? { consent } : {}) };
            save.mutate(payload, { onSuccess: () => setFormTarget(null) });
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this person?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> will disappear from this company, and from any plant
          that names them as a head.
        </p>
      </ConfirmDialog>
    </section>
  );
}
