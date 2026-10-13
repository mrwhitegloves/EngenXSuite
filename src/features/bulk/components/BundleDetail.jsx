import { useState } from 'react';
import { ArrowLeft, Building2, Pencil, Send, Trash2, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useBundle, useBundleActions, useBundleCandidates } from '../api.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

// Find people and companies that are not in the bundle yet, and add them.
function AddMembers({ bundleId }) {
  const { addMembers } = useBundleActions();
  const [search, setSearch] = useState('');
  const term = search.trim();
  const found = useBundleCandidates(bundleId, term);
  const add = (item) =>
    addMembers.mutate(
      item.kind === 'person'
        ? { id: bundleId, contactIds: [item.contactId] }
        : { id: bundleId, accountIds: [item.accountId], includePeople: false },
    );
  return (
    <section
      aria-label="Add to the bundle"
      className="space-y-2 rounded-lg border border-border bg-surface p-3"
    >
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Add someone who is not in it yet</span>
        <input
          type="search"
          placeholder="Type the name of a person or a company"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={inputClass}
        />
      </label>
      <FormError message={found.error?.message ?? addMembers.error?.message} />
      {term.length >= 2 && found.isSuccess && found.data.length === 0 && (
        <p className="text-sm text-text-muted">
          Nobody matches who is not in the bundle already (and has an email or a phone).
        </p>
      )}
      <ul className="max-h-56 divide-y divide-border overflow-y-auto text-sm">
        {(term.length >= 2 ? (found.data ?? []) : []).map((item) => (
          <li
            key={item.contactId ?? `company-${item.accountId}`}
            className="flex items-center gap-2 py-1.5"
          >
            {item.kind === 'person' ? (
              <User size={14} aria-hidden="true" className="shrink-0 text-text-muted" />
            ) : (
              <Building2 size={14} aria-hidden="true" className="shrink-0 text-text-muted" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate">
                {item.name}
                {item.kind === 'company' && (
                  <span className="text-text-muted"> (the company’s own address)</span>
                )}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {[item.kind === 'person' ? item.company : null, item.email, item.phone]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <button
              type="button"
              className={smallButton}
              disabled={addMembers.isPending}
              onClick={() => add(item)}
            >
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One bundle: who is in it (with company and open leads), add and remove, rename, delete, and
 * start a sending to it.
 * @param {{ bundleId: string, onBack: () => void, onSend: (bundle: object) => void }} props
 */
export default function BundleDetail({ bundleId, onBack, onSend }) {
  const can = useCan();
  const canEdit = can('campaigns', 'edit');
  const [page, setPage] = useState(1);
  const bundle = useBundle(bundleId, page);
  const actions = useBundleActions();
  const [dialog, setDialog] = useState(null); // 'rename' | 'delete'
  const [name, setName] = useState('');
  const data = bundle.data?.data;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All bundles
      </button>
      <FormError
        message={
          bundle.error?.status === 404
            ? 'This bundle does not exist, or it is not one of yours.'
            : bundle.error?.message
        }
      />
      {bundle.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold break-words">{data.bundle.name}</h2>
              <p className="text-sm text-text-muted">
                {data.bundle.memberCount} {data.bundle.memberCount === 1 ? 'address' : 'addresses'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      actions.rename.reset();
                      setName(data.bundle.name);
                      setDialog('rename');
                    }}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      actions.remove.reset();
                      setDialog('delete');
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </>
              )}
              {can('campaigns', 'create') && (
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={data.bundle.memberCount === 0}
                  onClick={() => onSend(data.bundle)}
                >
                  <Send size={16} aria-hidden="true" />
                  Send to this bundle
                </button>
              )}
            </div>
          </div>

          {canEdit && <AddMembers bundleId={bundleId} />}
          <FormError message={actions.removeMember.error?.message} />

          {data.members.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
              Nobody is in this bundle yet. Add people above, or choose companies on the Accounts
              screen and press “Make a bundle”.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Who is in the bundle</caption>
                <thead className="border-b border-border text-xs text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Phone
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Company
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Open leads
                    </th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member) => (
                    <tr key={member.id} className="border-b border-border align-top last:border-0">
                      <td className="px-3 py-2">
                        <span
                          className={member.isGone ? 'text-text-muted line-through' : 'font-medium'}
                        >
                          {member.name}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {member.isGone ? 'No longer in the CRM' : (member.role ?? 'Person')}
                        </span>
                      </td>
                      <td className="px-3 py-2 break-all">
                        {member.email ?? <span className="text-text-muted">none</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {member.phone ?? <span className="text-text-muted">none</span>}
                      </td>
                      <td className="px-3 py-2">
                        {member.company && (
                          <Link
                            to={`/accounts/${member.company.id}`}
                            className="hover:text-brand-text hover:underline"
                          >
                            {member.company.name}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {member.leads.length === 0 && <span className="text-text-muted">none</span>}
                        {member.leads.map((lead) => (
                          <Link
                            key={lead.id}
                            to={`/pipeline/${lead.id}`}
                            className="block hover:text-brand-text hover:underline"
                          >
                            {lead.name}
                          </Link>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEdit && (
                          <button
                            type="button"
                            aria-label={`Remove ${member.name} from the bundle`}
                            className="rounded p-1 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                            disabled={actions.removeMember.isPending}
                            onClick={() =>
                              actions.removeMember.mutate({ id: bundleId, memberId: member.id })
                            }
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            meta={bundle.data?.meta}
            noun={['address', 'addresses']}
            onPageChange={setPage}
          />
        </>
      )}

      {dialog === 'rename' && (
        <Dialog open title="Rename the bundle" onClose={() => setDialog(null)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              actions.rename.mutate(
                { id: bundleId, name: name.trim() },
                { onSuccess: () => setDialog(null) },
              );
            }}
          >
            <input
              aria-label="Name of the bundle"
              autoFocus
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
            <FormError message={actions.rename.error?.message} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={!name.trim() || actions.rename.isPending}
              >
                Save
              </button>
            </div>
          </form>
        </Dialog>
      )}
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Delete this bundle?"
        confirmLabel="Delete the bundle"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDialog(null)}
        onConfirm={() => actions.remove.mutate(bundleId, { onSuccess: onBack })}
      >
        <p>
          <strong>{data?.bundle.name}</strong> will be removed. The people and companies in it stay
          in the CRM, and sendings that were made from it keep their own record.
        </p>
      </ConfirmDialog>
    </div>
  );
}
