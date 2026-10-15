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
import RecordPicker from '../../assistant/components/RecordPicker.jsx';
import { useMailActions } from '../api.js';
import { smallButton } from '../mailFormat.js';

/**
 * Put a conversation on another lead or company, or on nothing. For when the sync linked it to
 * the wrong record, or to none.
 * @param {{ thread: object, onClose: () => void }} props
 */
export function RelinkPanel({ thread, onClose }) {
  const { relink } = useMailActions(thread.id);
  const save = (links) => relink.mutate(links, { onSuccess: onClose });
  return (
    <div className="space-y-2 rounded-md border border-border p-2 text-sm">
      <p className="font-medium">Which lead or company is this conversation about?</p>
      <RecordPicker
        label="Search a lead or a company"
        types={['lead', 'account']}
        onPick={(record) =>
          save(record.type === 'lead' ? { opportunityId: record.id } : { accountId: record.id })
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {(thread.account || thread.lead) && (
          <button
            type="button"
            className={smallButton}
            disabled={relink.isPending}
            onClick={() => save({})}
          >
            Take it off every record (then only its owner sees it)
          </button>
        )}
        <button type="button" className={smallButton} onClick={onClose}>
          Cancel
        </button>
      </div>
      {relink.isPending && (
        <p role="status" className="text-xs text-text-muted">
          Moving…
        </p>
      )}
      <FormError message={relink.error?.message} />
    </div>
  );
}

/**
 * A sender who is not in the CRM yet is a customer: add them to a new company (with a first
 * lead when wanted) or to a company that is there. Their mail of the last three months is
 * then brought in from the company mailbox.
 * @param {{ onClose: () => void, onDone: (accountId: string) => void }} props
 */
export function BringInDialog({ onClose, onDone }) {
  const { bringIn } = useMailActions();
  const [company, setCompany] = useState(null); // an existing company, when one was picked
  const [form, setForm] = useState({ email: '', contactName: '', accountName: '', leadName: '' });
  const errors = fieldErrorsFrom(bringIn.error);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const isReady =
    form.email.trim() && form.contactName.trim() && (company || form.accountName.trim());

  function submit(event) {
    event.preventDefault();
    bringIn.mutate(
      {
        email: form.email.trim(),
        contactName: form.contactName.trim(),
        ...(company
          ? { accountId: company.id }
          : {
              accountName: form.accountName.trim(),
              ...(form.leadName.trim() ? { leadName: form.leadName.trim() } : {}),
            }),
      },
      { onSuccess: (payload) => onDone(payload.data.accountId) },
    );
  }

  return (
    <Dialog open title="Add a new sender to the CRM" onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-text-muted">
          Mail of people who are not in the CRM is never stored. Add the person here, and your mail
          with them of the last three months is brought in.
        </p>
        <Field label="Their email address" error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoFocus
              value={form.email}
              onChange={set('email')}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Their name" error={errors.contactName}>
          {(props) => (
            <input
              {...props}
              maxLength={200}
              value={form.contactName}
              onChange={set('contactName')}
              className={inputClass}
            />
          )}
        </Field>
        {company ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Company:</span> {company.title}
            <button
              type="button"
              className="text-brand-text hover:underline"
              onClick={() => setCompany(null)}
            >
              Change
            </button>
          </p>
        ) : (
          <>
            <Field label="Their company (new)" error={errors.accountName}>
              {(props) => (
                <input
                  {...props}
                  maxLength={200}
                  value={form.accountName}
                  onChange={set('accountName')}
                  className={inputClass}
                />
              )}
            </Field>
            <div>
              <p className="mb-1 text-sm font-medium">…or a company that is in the CRM</p>
              <RecordPicker
                label="Search a company"
                types={['account']}
                onPick={(record) => setCompany(record)}
              />
            </div>
            <Field
              label="First lead (optional)"
              error={errors.leadName}
              hint="What they ask for, for example “OEE for the press line”."
            >
              {(props) => (
                <input
                  {...props}
                  maxLength={200}
                  value={form.leadName}
                  onChange={set('leadName')}
                  className={inputClass}
                />
              )}
            </Field>
          </>
        )}
        <FormError message={Object.keys(errors).length === 0 ? bringIn.error?.message : null} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!isReady || bringIn.isPending}
          >
            {bringIn.isPending ? 'Adding and reading mail…' : 'Add and bring in their mail'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
