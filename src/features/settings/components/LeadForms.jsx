import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Pagination from '../../../components/shared/Pagination.jsx';
import {
  FormError,
  compactInputClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';

const KEY = ['inbound-leads'];
const STATUS_LABELS = {
  received: 'Waiting',
  processed: 'Became a lead',
  duplicate: 'Same person again',
  failed: 'Failed',
};

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

// Whether Meta is connected, and what to give Meta.
function Setup({ setup }) {
  const address = `${window.location.origin}${setup.webhookPath}`;
  return (
    <section className="rounded-lg border border-border bg-surface p-4 text-sm">
      <h2 className="text-base font-semibold">Connection to Meta</h2>
      {setup.isConfigured ? (
        <p className="mt-1 text-success">Set up: leads from Meta lead ads are received.</p>
      ) : (
        <p role="alert" className="mt-1 text-danger">
          Not set up yet. Missing on the server: {setup.missing.join(', ')}.
        </p>
      )}
      <p className="mt-2 text-text-muted">
        In the Meta app, the webhook address for the “leadgen” field of the Page is this path on the
        public address of the API server:
      </p>
      <p className="mt-1 font-mono text-xs break-all">{setup.webhookPath}</p>
      <p className="mt-1 text-xs text-text-muted">
        (From this browser the server is reached as {address}; in production use the API server’s
        own address.)
      </p>
    </section>
  );
}

// One form: which question fills which field, who gets its leads, on or off.
function FormEditor({ form, page, canEdit }) {
  const queryClient = useQueryClient();
  const [fieldOf, setFieldOf] = useState(() =>
    Object.fromEntries(form.questions.map((item) => [item.question, item.crmField])),
  );
  const [ownerId, setOwnerId] = useState(form.defaultOwner?.id ?? '');
  const [categoryId, setCategoryId] = useState(form.defaultSolutionCategory?.id ?? '');
  const save = useMutation({
    mutationFn: (body) => apiRequest(`/lead-forms/${form.id}`, { method: 'PATCH', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  function submit(event) {
    event.preventDefault();
    save.mutate({
      fieldMapping: Object.entries(fieldOf)
        .filter(([, field]) => field)
        .map(([question, crmField]) => ({ question, crmField })),
      defaultOwnerId: ownerId || null,
      defaultSolutionCategoryId: categoryId || null,
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            {form.name}
            {!form.isActive && (
              <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-text-muted">
                Switched off
              </span>
            )}
          </h3>
          {canEdit && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={save.isPending}
              onClick={() => save.mutate({ isActive: !form.isActive })}
            >
              {form.isActive ? 'Switch off' : 'Switch on'}
            </button>
          )}
        </div>
        {!form.isActive && (
          <p className="text-sm text-text-muted">
            Enquiries of this form are still stored, but make no company, person or lead.
          </p>
        )}

        <fieldset disabled={!canEdit} className="space-y-2">
          <legend className="text-sm font-medium">Questions of the form</legend>
          {form.questions.length === 0 && (
            <p className="text-sm text-text-muted">
              The questions show here after the first lead of this form has arrived.
            </p>
          )}
          {form.questions.map((item) => (
            <label key={item.question} className="grid items-center gap-2 text-sm sm:grid-cols-2">
              <span className="break-words">{item.question}</span>
              <select
                value={fieldOf[item.question] ?? ''}
                onChange={(event) =>
                  setFieldOf({ ...fieldOf, [item.question]: event.target.value })
                }
                className={inputClass}
              >
                <option value="">
                  {item.automatic ? 'Recognised by its name' : 'Keep as a note on the lead'}
                </option>
                {page.fields.map((field) => (
                  <option key={field.field} value={field.field}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>

        <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Leads of this form go to</span>
            <select
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              className={inputClass}
            >
              <option value="">Whoever the assignment rule chooses</option>
              {page.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Solution of these leads</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {page.solutionCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <FormError message={save.error?.message} />
        {canEdit && (
          <div className="flex items-center gap-3">
            <button type="submit" className={primaryButtonClass} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save this form'}
            </button>
            {save.isSuccess && (
              <span role="status" className="text-sm text-success">
                Saved. It applies to the next lead of this form.
              </span>
            )}
          </div>
        )}
      </form>
    </li>
  );
}

// The enquiries as they arrived, with what became of each; a failed one can be tried again.
function InboundLeads({ canEdit }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const leads = useQuery({
    queryKey: [...KEY, 'list', status, page],
    queryFn: ({ signal }) =>
      apiRequest(`/inbound-leads?page=${page}${status ? `&status=${status}` : ''}`, { signal }),
    placeholderData: keepPreviousData,
  });
  const retry = useMutation({
    mutationFn: (id) => apiRequest(`/inbound-leads/${id}/retry`, { method: 'POST' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const rows = leads.data?.data ?? [];

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Leads that came in</h2>
        <select
          aria-label="Show"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={compactInputClass}
        >
          <option value="">All</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <FormError message={leads.error?.message ?? retry.error?.message} />
      {leads.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          {status ? 'None of this kind.' : 'No lead has come in yet.'}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-medium break-words">
                  {row.name ?? row.phone_number ?? row.email ?? 'No name yet'}
                  <span
                    className={`ml-2 text-xs font-normal ${row.status === 'failed' ? 'text-danger' : 'text-text-muted'}`}
                  >
                    {STATUS_LABELS[row.status]}
                    {row.repeatCount > 0 && ` · enquired ${row.repeatCount} more times`}
                  </span>
                </p>
                <p className="break-words text-text-muted">
                  {[row.formName, row.campaignName, formatMoment(row.receivedAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {row.error && <p className="break-words text-danger">{row.error}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {row.opportunityId && (
                  <Link to={`/pipeline/${row.opportunityId}`} className={secondaryButtonClass}>
                    Open the lead
                  </Link>
                )}
                {canEdit && ['failed', 'received'].includes(row.status) && (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={retry.isPending}
                    onClick={() => retry.mutate(row.id)}
                  >
                    Try again
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={leads.data?.meta} noun={['lead', 'leads']} onPageChange={setPage} />
    </section>
  );
}

// Settings → Lead forms: the Meta lead forms, how their answers fill the CRM, and the leads
// that came in.
export default function LeadForms({ canEdit }) {
  const page = useQuery({
    queryKey: [...KEY, 'forms'],
    queryFn: ({ signal }) => apiRequest('/lead-forms', { signal }),
    select: (payload) => payload.data,
  });

  return (
    <div className="space-y-6">
      <FormError message={page.error?.message} />
      {page.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {page.data && (
        <>
          <Setup setup={page.data.setup} />
          <section className="space-y-2">
            <h2 className="font-semibold">Forms</h2>
            <p className="max-w-2xl text-sm text-text-muted">
              A form appears here by itself when its first lead arrives. Name, phone, email,
              company, job title and city are recognised by the question’s name; choose a field for
              any other question, or leave it to be kept as a note on the lead.
            </p>
            {page.data.forms.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
                No form yet. It shows after the first lead from a Meta lead ad.
              </p>
            )}
            <ul className="space-y-3">
              {page.data.forms.map((form) => (
                <FormEditor key={form.id} form={form} page={page.data} canEdit={canEdit} />
              ))}
            </ul>
          </section>
          <InboundLeads canEdit={canEdit} />
        </>
      )}
    </div>
  );
}
