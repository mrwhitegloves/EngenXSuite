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
// The first lead of the new company; left empty, no lead is made.
const EMPTY_LEAD = { name: '', valueRupees: '', requirement: '', nextActionText: '' };
const MAX_PEOPLE = 10;

const filled = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => String(value).trim() !== ''));

/**
 * The "New" form of the top bar: a company, its people and, when wanted, the first lead,
 * entered in one go.
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
  const [lead, setLead] = useState(EMPTY_LEAD);
  const mayAddPeople = can('contacts', 'create');
  const mayAddLead = can('opportunities', 'create');
  // The lead part counts only when something was typed into it; then it needs a name.
  const hasLead = mayAddLead && Object.keys(filled(lead)).length > 0;
  const setLeadField = (field) => (event) => setLead({ ...lead, [field]: event.target.value });

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
        ...(hasLead ? { lead: leadBody() } : {}),
      },
      {
        onSuccess: (payload) => {
          onClose();
          // With a lead: straight to it. Otherwise to the list, newest first.
          navigate(
            payload.data.lead ? `/pipeline/${payload.data.lead.id}` : '/accounts?sort=-createdAt',
          );
        },
      },
    );
  }

  function leadBody() {
    const rupees = Number(lead.valueRupees);
    return {
      name: lead.name.trim(),
      ...(lead.valueRupees.trim() && !Number.isNaN(rupees)
        ? { estimatedValuePaise: Math.round(rupees * 100) }
        : {}),
      ...(lead.requirement.trim() ? { requirement: lead.requirement.trim() } : {}),
      ...(lead.nextActionText.trim() ? { nextAction: { text: lead.nextActionText.trim() } } : {}),
    };
  }

  const leadInput = (field, label, props = {}) => (
    <Field label={label} error={errors[`lead.${props.serverField ?? field}`]} hint={props.hint}>
      {(fieldProps) => (
        <input
          {...fieldProps}
          inputMode={props.inputMode}
          value={lead[field]}
          onChange={setLeadField(field)}
          placeholder={props.placeholder}
          className={inputClass}
        />
      )}
    </Field>
  );

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
    <Dialog
      open
      wide
      title={mayAddLead ? 'New company, people and lead' : 'New company and people'}
      onClose={onClose}
    >
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

        {mayAddLead && (
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-semibold text-text-muted uppercase">
              First lead (optional)
            </legend>
            <p className="text-sm text-text-muted">
              What this company may buy. Leave it empty to add only the company
              {mayAddPeople ? ' and its people' : ''}. The first person above becomes the lead’s
              main contact; the lead starts in the first pipeline stage and is yours.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {leadInput('name', 'What is it about?', {
                  placeholder: 'For example: OEE for the press line',
                })}
              </div>
              {leadInput('valueRupees', 'Estimated value (₹)', {
                inputMode: 'decimal',
                serverField: 'estimatedValuePaise',
              })}
              {leadInput('nextActionText', 'Next action', {
                placeholder: 'For example: Send the brochure',
                serverField: 'nextAction.text',
              })}
              <div className="sm:col-span-2">{leadInput('requirement', 'What they need')}</div>
            </div>
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
              disabled={
                !company.name.trim() ||
                !everyPersonHasName ||
                (hasLead && !lead.name.trim()) ||
                quickAdd.isPending
              }
            >
              {quickAdd.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
