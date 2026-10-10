import { useState } from 'react';
import Dialog from '../../../components/shared/Dialog.jsx';
import { TagPicker } from '../../../components/shared/Tags.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useTagsFor } from '../../../hooks/useTags.js';
import {
  EMPTY_ACCOUNT_FORM,
  HEALTH_LABELS,
  POTENTIAL_LABELS,
  SERVER_FIELD_TO_FORM,
  accountToForm,
  changedParts,
  formToAccountBody,
  withoutEmptyParts,
} from '../accountForm.js';
import {
  isDuplicateName,
  useAccount,
  useAccountOptions,
  useCreateAccount,
  useUpdateAccount,
} from '../api.js';

function Section({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-text-muted uppercase">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

// The form itself. Rendered only when its starting values are known, so it never starts empty
// and then jumps.
function AccountForm({ account, options, onClose }) {
  const isNew = !account;
  const initial = isNew ? EMPTY_ACCOUNT_FORM : accountToForm(account);
  const [form, setForm] = useState(initial);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const save = isNew ? createAccount : updateAccount;
  const tags = useTagsFor('account');

  const serverErrors = Object.fromEntries(
    Object.entries(fieldErrorsFrom(save.error)).map(([field, message]) => [
      SERVER_FIELD_TO_FORM[field] ?? field,
      message,
    ]),
  );
  const isDuplicate = isDuplicateName(save.error);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  // Statuses that can be chosen: the active ones, plus the account's own if it was switched off.
  const statuses = options.statuses.filter(
    (status) => status.isActive || status.id === initial.statusId,
  );

  function submit(confirmDuplicate) {
    const body = formToAccountBody(form);
    const extra = confirmDuplicate ? { confirmDuplicate: true } : {};
    if (isNew) {
      save.mutate({ ...withoutEmptyParts(body), ...extra }, { onSuccess: onClose });
      return;
    }
    const changes = changedParts(body, formToAccountBody(initial));
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    save.mutate({ id: account.id, ...changes, ...extra }, { onSuccess: onClose });
  }

  const input = (field, label, props = {}) => (
    <Field label={label} error={serverErrors[field]} hint={props.hint}>
      {(fieldProps) => (
        <input
          {...fieldProps}
          type={props.type ?? 'text'}
          inputMode={props.inputMode}
          value={form[field]}
          onChange={set(field)}
          placeholder={props.placeholder}
          className={inputClass}
        />
      )}
    </Field>
  );
  const select = (field, label, choices, emptyLabel) => (
    <Field label={label} error={serverErrors[field]}>
      {(fieldProps) => (
        <select {...fieldProps} value={form[field]} onChange={set(field)} className={inputClass}>
          <option value="">{emptyLabel}</option>
          {choices.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
    >
      {!isNew && (
        <p className="text-sm text-text-muted">
          Code <span className="font-mono text-text">{account.accountCode}</span>
          {account.formFilledBy?.name && <> · Added by {account.formFilledBy.name}</>}
        </p>
      )}

      <Section title="Company">
        <div className="sm:col-span-2">{input('name', 'Company name')}</div>
        {select(
          'statusId',
          'Status',
          statuses.map((status) => [status.id, status.name]),
          isNew ? 'Default status' : 'Choose a status',
        )}
        {input('industry', 'Industry', { placeholder: 'For example: Auto components' })}
        {input('companyType', 'Group / company type')}
        {select(
          'companySize',
          'Company size (people)',
          options.companySizes.map((size) => [size, size]),
          'Not known',
        )}
        {input('phone_number', 'Phone', {
          inputMode: 'tel',
          hint: 'The company’s main number, with its area code.',
        })}
        {input('email', 'Email', { type: 'email', hint: 'A general address, like info@…' })}
        {input('website', 'Website', { placeholder: 'example.com' })}
        {input('linkedinUrl', 'LinkedIn page', { placeholder: 'linkedin.com/company/…' })}
        <div className="sm:col-span-2">
          <Field label="About the company" error={serverErrors.description}>
            {(fieldProps) => (
              <textarea
                {...fieldProps}
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={set('description')}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Head office">
        <div className="sm:col-span-2">{input('hqAddressLine', 'Address')}</div>
        {input('hqCity', 'City')}
        {input('hqState', 'State')}
        {input('hqCountry', 'Country')}
        {input('hqPincode', 'PIN code', { inputMode: 'numeric' })}
        {input('region', 'Region', { hint: 'Your own grouping, for example West or Gulf.' })}
      </Section>

      <Section title="Commercial">
        {input('revenueRupees', 'Yearly revenue (₹)', { inputMode: 'decimal' })}
        {select(
          'accountPotential',
          'Account potential',
          Object.entries(POTENTIAL_LABELS),
          'Not set',
        )}
        {select('relationshipHealth', 'Relationship', Object.entries(HEALTH_LABELS), 'Not set')}
        {select(
          'strategicImportance',
          'Strategic importance',
          [1, 2, 3, 4, 5].map((level) => [String(level), `${level} of 5`]),
          'Not set',
        )}
        {input('gstin', 'GSTIN', { hint: 'Shown in full only to people who may edit.' })}
        {input('pan', 'PAN')}
      </Section>

      <Section title="Systems in use">
        {input('existingPlc', 'PLC')}
        {input('existingScada', 'SCADA')}
        {input('existingMes', 'MES')}
        {input('existingErp', 'ERP')}
      </Section>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-muted uppercase">Tags</legend>
        <TagPicker
          tags={tags}
          value={form.tagIds}
          onChange={(tagIds) => setForm({ ...form, tagIds })}
        />
        {serverErrors.tagIds && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {serverErrors.tagIds}
          </p>
        )}
      </fieldset>

      {options.canAssign && (
        <Section title="Who works on it">
          {select(
            'ownerId',
            'Owner',
            options.users.map((user) => [user.id, user.name]),
            isNew ? 'Me' : 'Choose an owner',
          )}
          <Field
            label="Also assigned to"
            hint="Hold Ctrl (or Cmd) to choose several."
            error={serverErrors.assignedUserIds}
          >
            {(fieldProps) => (
              <select
                {...fieldProps}
                multiple
                size={Math.min(5, Math.max(3, options.users.length))}
                value={form.assignedUserIds}
                onChange={(event) =>
                  setForm({
                    ...form,
                    assignedUserIds: [...event.target.selectedOptions].map((item) => item.value),
                  })
                }
                className={inputClass}
              >
                {options.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Section>
      )}

      {isDuplicate ? (
        <div role="alert" className="rounded-md border border-warning p-3 text-sm">
          <p className="font-medium">{save.error.message}</p>
          <p className="mt-1 text-text-muted">
            If this is really a different company, you can save it anyway.
          </p>
          <button
            type="button"
            className={`${secondaryButtonClass} mt-2`}
            disabled={save.isPending}
            onClick={() => submit(true)}
          >
            Save anyway
          </button>
        </div>
      ) : (
        <FormError message={Object.keys(serverErrors).length === 0 ? save.error?.message : null} />
      )}
      {Object.keys(serverErrors).length > 0 && !isDuplicate && (
        <FormError message="Some fields need a correction. They are marked above." />
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={!form.name.trim() || save.isPending}
        >
          {save.isPending ? 'Saving…' : isNew ? 'Create account' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

/**
 * Create an account (no `accountId`) or edit one.
 * @param {{ accountId?: string, onClose: () => void }} props
 */
export default function AccountFormDialog({ accountId, onClose }) {
  const options = useAccountOptions();
  const account = useAccount(accountId);
  const isReady = options.isSuccess && (!accountId || account.isSuccess);

  return (
    <Dialog open wide title={accountId ? 'Edit account' : 'New account'} onClose={onClose}>
      <FormError message={options.error?.message ?? account.error?.message} />
      {!isReady && !options.error && !account.error && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {isReady && (
        <AccountForm
          account={accountId ? account.data : null}
          options={options.data}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}
