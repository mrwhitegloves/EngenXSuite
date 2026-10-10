import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { useCan } from '../../../hooks/useCan.js';
import { STAKEHOLDER_ROLE_LABELS } from '../accountForm.js';
import { isDuplicateName, useAccountOptions, useQuickAdd } from '../api.js';

const EMPTY_PERSON = {
  name: '',
  designation: '',
  phone_number: '',
  email: '',
  stakeholderRole: '',
};
const EMPTY_COMPANY = {
  name: '',
  statusId: '',
  industry: '',
  phone_number: '',
  email: '',
  website: '',
  city: '',
  state: '',
};
const MAX_PEOPLE = 10;

const filled = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => String(value).trim() !== ''));

/**
 * The "New" form of the top bar: a company and its people entered in one go.
 * The server records who filled it in (formFilledBy) on the company and on each person.
 */
export default function QuickAddDialog({ onClose }) {
  const { user } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const options = useAccountOptions();
  const quickAdd = useQuickAdd();
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [people, setPeople] = useState([EMPTY_PERSON]);
  const mayAddPeople = can('contacts', 'create');

  const errors = fieldErrorsFrom(quickAdd.error);
  const isDuplicate = isDuplicateName(quickAdd.error);
  const hasFieldErrors = Object.keys(errors).length > 0 && !isDuplicate;
  // A row counts only when something was typed into it.
  const typedPeople = people.filter((person) => Object.keys(filled(person)).length > 0);
  const everyPersonHasName = typedPeople.every((person) => person.name.trim());

  const setCompanyField = (field) => (event) =>
    setCompany({ ...company, [field]: event.target.value });
  const setPersonField = (index, field) => (event) =>
    setPeople(
      people.map((person, position) =>
        position === index ? { ...person, [field]: event.target.value } : person,
      ),
    );

  function submit(confirmDuplicate) {
    const { city, state, ...rest } = company;
    const hq = filled({ city, state });
    quickAdd.mutate(
      {
        account: {
          ...filled(rest),
          ...(Object.keys(hq).length ? { hq } : {}),
          ...(confirmDuplicate ? { confirmDuplicate: true } : {}),
        },
        contacts: mayAddPeople ? typedPeople.map(filled) : [],
      },
      {
        onSuccess: () => {
          onClose();
          navigate('/accounts?sort=-createdAt');
        },
      },
    );
  }

  const companyInput = (field, label, props = {}) => (
    <Field label={label} error={errors[`account.${props.serverField ?? field}`]} hint={props.hint}>
      {(fieldProps) => (
        <input
          {...fieldProps}
          type={props.type ?? 'text'}
          inputMode={props.inputMode}
          value={company[field]}
          onChange={setCompanyField(field)}
          placeholder={props.placeholder}
          className={inputClass}
        />
      )}
    </Field>
  );

  return (
    <Dialog open wide title="New company and people" onClose={onClose}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        <FormError message={options.error?.message} />

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-semibold text-text-muted uppercase">Company</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">{companyInput('name', 'Company name')}</div>
            <Field label="Status" error={errors['account.statusId']}>
              {(fieldProps) => (
                <select
                  {...fieldProps}
                  value={company.statusId}
                  onChange={setCompanyField('statusId')}
                  className={inputClass}
                >
                  <option value="">Default status</option>
                  {(options.data?.statuses ?? [])
                    .filter((status) => status.isActive)
                    .map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            {companyInput('industry', 'Industry')}
            {companyInput('phone_number', 'Company phone', { inputMode: 'tel' })}
            {companyInput('email', 'Company email', { type: 'email' })}
            {companyInput('website', 'Website', { placeholder: 'example.com' })}
            {companyInput('city', 'City', { serverField: 'hq.city' })}
            {companyInput('state', 'State', { serverField: 'hq.state' })}
          </div>
        </fieldset>

        {mayAddPeople && (
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-semibold text-text-muted uppercase">
              People at this company
            </legend>
            {people.map((person, index) => {
              // The server numbers people by their position among the typed rows.
              const serverIndex = typedPeople.indexOf(person);
              const error = (field) =>
                serverIndex >= 0 ? errors[`contacts.${serverIndex}.${field}`] : undefined;
              const personInput = (field, label, props = {}) => (
                <Field label={label} error={error(field)}>
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type={props.type ?? 'text'}
                      inputMode={props.inputMode}
                      value={person[field]}
                      onChange={setPersonField(index, field)}
                      className={inputClass}
                    />
                  )}
                </Field>
              );
              return (
                <div
                  key={index}
                  role="group"
                  aria-label={`Person ${index + 1}`}
                  className="rounded-md border border-border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Person {index + 1}</span>
                    {people.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove person ${index + 1}`}
                        onClick={() =>
                          setPeople(people.filter((_, position) => position !== index))
                        }
                        className="rounded p-1 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {personInput('name', 'Name')}
                    {personInput('designation', 'Designation')}
                    {personInput('phone_number', 'Phone', { inputMode: 'tel' })}
                    {personInput('email', 'Email', { type: 'email' })}
                    <Field label="Role in decisions" error={error('stakeholderRole')}>
                      {(fieldProps) => (
                        <select
                          {...fieldProps}
                          value={person.stakeholderRole}
                          onChange={setPersonField(index, 'stakeholderRole')}
                          className={inputClass}
                        >
                          <option value="">Not known</option>
                          {Object.entries(STAKEHOLDER_ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </div>
                </div>
              );
            })}
            {people.length < MAX_PEOPLE && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setPeople([...people, EMPTY_PERSON])}
              >
                <Plus size={16} aria-hidden="true" />
                Add another person
              </button>
            )}
          </fieldset>
        )}

        {isDuplicate ? (
          <div role="alert" className="rounded-md border border-warning p-3 text-sm">
            <p className="font-medium">{quickAdd.error.message}</p>
            <p className="mt-1 text-text-muted">
              If this is really a different company, you can save it anyway.
            </p>
            <button
              type="button"
              className={`${secondaryButtonClass} mt-2`}
              disabled={quickAdd.isPending}
              onClick={() => submit(true)}
            >
              Save anyway
            </button>
          </div>
        ) : (
          <FormError
            message={
              hasFieldErrors
                ? 'Some fields need a correction. They are marked above.'
                : quickAdd.error?.message
            }
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-text-muted">Form filled by {user.name}</p>
          <div className="flex gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={!company.name.trim() || !everyPersonHasName || quickAdd.isPending}
            >
              {quickAdd.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
