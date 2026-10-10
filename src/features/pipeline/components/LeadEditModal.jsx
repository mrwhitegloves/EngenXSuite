import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { apiRequest } from '../../../lib/apiClient.js';
import { isStaleData, useCreateLead, useLead, useLeadOptions, useUpdateLead } from '../api.js';
import {
  ACCOUNT_FIELDS,
  BUDGET_LABELS,
  CONTACT_FIELDS,
  EMPTY_LEAD_FORM,
  FEASIBILITY_LABELS,
  RISK_LABELS,
  changedFields,
  formToLeadBody,
  leadToForm,
  newLeadBody,
} from '../leadForm.js';

// Where the server reports an error → the form field that shows it.
const SERVER_FIELD_TO_FORM = {
  estimatedValuePaise: 'valueRupees',
  'nextAction.text': 'nextActionText',
  'nextAction.dueAt': 'nextActionDueAt',
  'risk.level': 'riskLevel',
  'risk.note': 'riskNote',
  'contact.name': 'contactName',
  'contact.designation': 'contactDesignation',
  'contact.phone_number': 'contactPhone',
  'contact.email': 'contactEmail',
  'account.name': 'accountName',
  'account.industry': 'accountIndustry',
  'account.phone_number': 'accountPhone',
  'account.email': 'accountEmail',
  'account.website': 'accountWebsite',
  'account.hq.city': 'accountCity',
};
// A field the person has changed stays orange until it is saved or reset.
const CHANGED_CLASS = 'border-edited bg-edited-soft';

/** The companies a new lead can be made for (the first 100 by name the person may see). */
function useAccountChoices(enabled) {
  return useQuery({
    queryKey: ['accounts', 'list', { pageSize: 100, sort: 'name' }],
    queryFn: ({ signal }) => apiRequest('/accounts?pageSize=100&sort=name', { signal }),
    select: (payload) => payload.data,
    enabled,
  });
}

/** The people of the lead's company, for "main contact". */
function useAccountPeople(accountId) {
  return useQuery({
    queryKey: ['contacts', accountId],
    queryFn: ({ signal }) => apiRequest(`/accounts/${accountId}/contacts`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(accountId),
    // A lead can be assigned to someone who may not open its company: then there is no list.
    retry: false,
  });
}

function Section({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-text-muted uppercase">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

// The form itself. Rendered only when its starting values are known.
function LeadForm({ lead: latestLead, presetAccount, options, onClose, onReload }) {
  // The lead as it was when the form opened. A live update from someone else must not replace
  // what the person is typing; the server tells us at Save when the lead has moved on.
  const [lead] = useState(latestLead);
  const isNew = !lead;
  const [initial] = useState(() =>
    isNew ? { ...EMPTY_LEAD_FORM, accountId: presetAccount?.id ?? '' } : leadToForm(lead),
  );
  const [form, setForm] = useState(initial);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const save = isNew ? createLead : updateLead;
  const accounts = useAccountChoices(isNew && !presetAccount);
  const people = useAccountPeople(form.accountId);
  const tags = useTagsFor('opportunity');

  // The main contact's own details can be changed here while it is still the same person
  // (choosing another main contact above is a different change), and only by someone who may
  // edit contacts; the company's details only by someone who may edit that company.
  const showContact =
    !isNew && lead.canEditContact && form.primaryContactId === initial.primaryContactId;
  const showAccount = !isNew && lead.canEditAccount;
  const changed = isNew
    ? []
    : changedFields(form, initial).filter(
        (field) =>
          (showContact || !CONTACT_FIELDS.includes(field)) &&
          (showAccount || !ACCOUNT_FIELDS.includes(field)),
      );
  const isStale = isStaleData(save.error);
  const serverErrors = Object.fromEntries(
    Object.entries(fieldErrorsFrom(save.error)).map(([field, message]) => [
      SERVER_FIELD_TO_FORM[field] ?? field,
      message,
    ]),
  );
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const mark = (field) => (changed.includes(field) ? CHANGED_CLASS : '');

  // Entries that can be chosen: the active ones, plus the lead's own if it was switched off.
  const usable = (items, currentId) =>
    items.filter((item) => item.isActive || item.id === currentId);
  const stages = usable(options.stages, initial.stageId);
  const chosenStage = options.stages.find((stage) => stage.id === form.stageId);
  const isClosing =
    !isNew && chosenStage && chosenStage.type !== 'open' && form.stageId !== initial.stageId;

  function submit(overwrite) {
    if (isNew) {
      save.mutate(newLeadBody(form), { onSuccess: onClose });
      return;
    }
    if (changed.length === 0) {
      onClose();
      return;
    }
    save.mutate(
      {
        id: lead.id,
        ...formToLeadBody(form, changed),
        // Lets the server notice that someone else saved this lead in the meantime.
        expectedUpdatedAt: lead.updatedAt,
        ...(overwrite ? { overwrite: true } : {}),
      },
      { onSuccess: onClose },
    );
  }

  const input = (field, label, props = {}) => (
    <Field label={label} error={serverErrors[field]} hint={props.hint}>
      {(fieldProps) => (
        <input
          {...fieldProps}
          type={props.type ?? 'text'}
          inputMode={props.inputMode}
          value={form[field]}
          onChange={(event) => set(field, event.target.value)}
          placeholder={props.placeholder}
          className={`${inputClass} ${mark(field)}`}
        />
      )}
    </Field>
  );
  const area = (field, label) => (
    <div className="sm:col-span-2">
      <Field label={label} error={serverErrors[field]}>
        {(fieldProps) => (
          <textarea
            {...fieldProps}
            rows={2}
            maxLength={2000}
            value={form[field]}
            onChange={(event) => set(field, event.target.value)}
            className={`${inputClass} ${mark(field)}`}
          />
        )}
      </Field>
    </div>
  );
  const select = (field, label, choices, emptyLabel, props = {}) => (
    <Field label={label} error={serverErrors[field]} hint={props.hint}>
      {(fieldProps) => (
        <select
          {...fieldProps}
          value={form[field]}
          disabled={props.disabled}
          onChange={(event) => set(field, event.target.value)}
          className={`${inputClass} ${mark(field)}`}
        >
          {emptyLabel !== null && <option value="">{emptyLabel}</option>}
          {choices.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
  const picker = (field, label, items) => (
    <fieldset className={`rounded-md border p-3 ${mark(field) || 'border-transparent px-0'}`}>
      <legend className="mb-2 text-sm font-semibold text-text-muted uppercase">{label}</legend>
      <TagPicker
        label={label}
        tags={items}
        value={form[field]}
        onChange={(ids) => set(field, ids)}
      />
      {serverErrors[field] && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {serverErrors[field]}
        </p>
      )}
    </fieldset>
  );

  const hasFieldErrors = Object.keys(serverErrors).length > 0;
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
          Code <span className="font-mono text-text">{lead.leadCode}</span>
          {lead.account?.name && <> · {lead.account.name}</>}
        </p>
      )}

      <Section title="Lead">
        <div className="sm:col-span-2">
          {input('name', 'What is it about?', {
            placeholder: 'For example: OEE for the press line',
          })}
        </div>
        {isNew &&
          (presetAccount ? (
            <Field label="Company">
              {(fieldProps) => (
                <input {...fieldProps} value={presetAccount.name} disabled className={inputClass} />
              )}
            </Field>
          ) : (
            select(
              'accountId',
              'Company',
              (accounts.data ?? []).map((account) => [account.id, account.name]),
              accounts.isPending ? 'Loading…' : 'Choose a company',
              { hint: 'Not in the list? Add the company first, under Accounts.' },
            )
          ))}
        {select(
          'primaryContactId',
          'Main contact',
          (people.data ?? []).map((person) => [person.id, person.name]),
          form.accountId ? 'Nobody chosen' : 'Choose the company first',
        )}
        {select(
          'leadStatusId',
          'Status',
          usable(options.leadStatuses, initial.leadStatusId).map((status) => [
            status.id,
            status.name,
          ]),
          isNew ? 'Default status' : null,
        )}
        {select(
          'stageId',
          'Pipeline stage',
          (isNew ? stages.filter((stage) => stage.type === 'open') : stages).map((stage) => [
            stage.id,
            stage.name,
          ]),
          isNew ? 'First stage' : null,
        )}
        {isClosing && (
          <>
            <div className="sm:col-span-2">
              {input(
                'closeReason',
                chosenStage.type === 'won' ? 'Why was it won?' : 'Why was it lost?',
                { hint: 'Needed to close a lead.' },
              )}
            </div>
            {chosenStage.type === 'lost' && input('lostToCompetitor', 'Lost to (competitor)')}
          </>
        )}
      </Section>

      <Section title="Value">
        {input('valueRupees', 'Estimated value (₹)', { inputMode: 'decimal' })}
        {input('probability', 'Chance of winning (%)', {
          inputMode: 'numeric',
          hint: 'Set by the stage when the stage changes.',
        })}
        {input('expectedCloseDate', 'Expected to close on', { type: 'date' })}
        {select('budgetStatus', 'Budget', Object.entries(BUDGET_LABELS), 'Not set')}
      </Section>

      {picker('solutionCategoryIds', 'Solutions', usable(options.solutionCategories))}

      <Section title="Requirement">
        {area('requirement', 'What they need')}
        {area('problemStatement', 'The problem today')}
        {area('expectedImpact', 'What it would improve')}
        {select(
          'technicalFeasibility',
          'Technical feasibility',
          Object.entries(FEASIBILITY_LABELS),
          'Not set',
        )}
        {input('decisionTimeline', 'When will they decide?')}
        {input('competitor', 'Competitor')}
      </Section>

      <Section title="Next step and risk">
        {input('nextActionText', 'Next action', { placeholder: 'For example: Send the proposal' })}
        {input('nextActionDueAt', 'Due', { type: 'datetime-local' })}
        {select('riskLevel', 'Risk', Object.entries(RISK_LABELS), 'Not set')}
        {input('riskNote', 'Risk note')}
      </Section>

      {tags.length > 0 && picker('tagIds', 'Tags', tags)}

      {showContact && (
        <Section title="Main contact">
          {input('contactName', 'Name')}
          {input('contactDesignation', 'Designation')}
          {input('contactPhone', 'Phone', { inputMode: 'tel' })}
          {input('contactEmail', 'Email', { type: 'email' })}
        </Section>
      )}

      {showAccount && (
        <Section title="Company">
          {input('accountName', 'Company name')}
          {input('accountIndustry', 'Industry')}
          {input('accountPhone', 'Company phone', { inputMode: 'tel' })}
          {input('accountEmail', 'Company email', { type: 'email' })}
          {input('accountWebsite', 'Website')}
          {input('accountCity', 'City')}
        </Section>
      )}

      {options.canAssign && (
        <Section title="Who works on it">
          {select(
            'ownerId',
            'Owner',
            options.users.map((user) => [user.id, user.name]),
            isNew ? 'Me' : 'Unassigned',
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
                  set(
                    'assignedUserIds',
                    [...event.target.selectedOptions].map((item) => item.value),
                  )
                }
                className={`${inputClass} ${mark('assignedUserIds')}`}
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

      {isStale ? (
        <div role="alert" className="rounded-md border border-warning p-3 text-sm">
          <p className="font-medium">Someone else changed this lead while you were editing it.</p>
          <p className="mt-1 text-text-muted">
            Load their version to see it (your changes here are dropped), or save yours on top.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onReload}>
              Load the newer version
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={save.isPending}
              onClick={() => submit(true)}
            >
              Save mine anyway
            </button>
          </div>
        </div>
      ) : (
        <FormError
          message={
            hasFieldErrors
              ? 'Some fields need a correction. They are marked above.'
              : save.error?.message
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {changed.length > 0 && (
          <>
            <span className="mr-auto text-sm text-edited">
              {changed.length} {changed.length === 1 ? 'field' : 'fields'} changed
            </span>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setForm(initial);
                save.reset();
              }}
            >
              Reset
            </button>
          </>
        )}
        <button type="button" className={secondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={
            !form.name.trim() ||
            !form.accountId ||
            save.isPending ||
            (isClosing && !form.closeReason.trim())
          }
        >
          {save.isPending ? 'Saving…' : isNew ? 'Create lead' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

/**
 * THE one form for a lead: create (no `leadId`) or edit. Opened from every place a lead is
 * shown, so a lead is always edited the same way.
 * @param {{ leadId?: string, account?: { id: string, name: string }, onClose: () => void }} props
 *        account: for a new lead started from a company's page
 */
export default function LeadEditModal({ leadId, account, onClose }) {
  const options = useLeadOptions();
  const lead = useLead(leadId);
  // Raised by "Load the newer version": the form then starts again from the newest lead.
  const [version, setVersion] = useState(0);
  const isReady = options.isSuccess && (!leadId || lead.isSuccess);

  return (
    <Dialog open wide title={leadId ? 'Edit lead' : 'New lead'} onClose={onClose}>
      <FormError
        message={
          options.error?.message ??
          (lead.error?.status === 404
            ? 'This lead does not exist, or it is not one of yours.'
            : lead.error?.message)
        }
      />
      {!isReady && !options.error && !lead.error && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {isReady && (
        <LeadForm
          key={version}
          lead={leadId ? lead.data : null}
          presetAccount={account}
          options={options.data}
          onClose={onClose}
          onReload={() => lead.refetch().then(() => setVersion((current) => current + 1))}
        />
      )}
    </Dialog>
  );
}
