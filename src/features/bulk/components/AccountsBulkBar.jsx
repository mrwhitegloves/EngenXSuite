import { useState } from 'react';
import { Download, Layers, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useAccountsBulk, useBundleActions } from '../api.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

// A bundle from the chosen companies: their people, their own address, or both.
function BundleDialog({ accountIds, onClose }) {
  const { create } = useBundleActions();
  const [name, setName] = useState('');
  const [includePeople, setIncludePeople] = useState(true);
  const [includeCompany, setIncludeCompany] = useState(true);
  const errors = fieldErrorsFrom(create.error);
  const made = create.data?.data;

  return (
    <Dialog open title={`A bundle from ${accountIds.length} companies`} onClose={onClose}>
      {made ? (
        <div className="space-y-3">
          <p>
            <strong>{made.name}</strong> holds {made.memberCount}{' '}
            {made.memberCount === 1 ? 'address' : 'addresses'}.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Close
            </button>
            <Link to={`/bulk?bundle=${made.id}`} className={primaryButtonClass}>
              Open the bundle
            </Link>
          </div>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ name: name.trim(), accountIds, includePeople, includeCompany });
          }}
        >
          <Field label="Name of the bundle" error={errors.name}>
            {(props) => (
              <input
                {...props}
                autoFocus
                maxLength={120}
                value={name}
                placeholder="For example: Foundries in Pune, October"
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <fieldset className="space-y-1 text-sm">
            <legend className="mb-1 font-medium">Who goes into it</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-brand"
                checked={includePeople}
                onChange={(event) => setIncludePeople(event.target.checked)}
              />
              The people of each company (those with an email or a phone)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-brand"
                checked={includeCompany}
                onChange={(event) => setIncludeCompany(event.target.checked)}
              />
              The company’s own email and phone
            </label>
          </fieldset>
          <FormError message={Object.keys(errors).length === 0 ? create.error?.message : null} />
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={!name.trim() || (!includePeople && !includeCompany) || create.isPending}
            >
              {create.isPending ? 'Making…' : 'Make the bundle'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// Give the chosen companies to people. One person: all to them. Several: they take turns.
function AssignDialog({ accountIds, users, onClose }) {
  const { assign } = useAccountsBulk();
  const [chosen, setChosen] = useState([]);
  const result = assign.data?.data;
  const toggle = (id) =>
    setChosen(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);

  return (
    <Dialog open title={`Assign ${accountIds.length} companies`} onClose={onClose}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p>
            <strong>{result.assigned}</strong> assigned.{' '}
            {result.skipped > 0 && (
              <>
                <strong>{result.skipped}</strong> skipped, because they have an owner already.
              </>
            )}
          </p>
          <ul className="list-disc pl-5">
            {result.perUser.map((user) => (
              <li key={user.name}>
                {user.name}: {user.count}
              </li>
            ))}
          </ul>
          {result.skippedNames.length > 0 && (
            <p className="text-text-muted">
              Skipped: {result.skippedNames.join(', ')}
              {result.skipped > result.skippedNames.length && ' and more'}
            </p>
          )}
          {result.failed.map((item) => (
            <p key={item.name} className="text-danger">
              {item.name}: {item.reason}
            </p>
          ))}
          <div className="flex justify-end">
            <button type="button" className={primaryButtonClass} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-text-muted">
            Choose one person, and all go to them. Choose several, and they take turns (round
            robin). A company that has an owner already is left with that person.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={smallButton}
              onClick={() => setChosen(users.map((user) => user.id))}
            >
              Everyone
            </button>
            <button type="button" className={smallButton} onClick={() => setChosen([])}>
              Nobody
            </button>
          </div>
          <div className="grid max-h-56 gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={chosen.includes(user.id)}
                  onChange={() => toggle(user.id)}
                />
                <span className="truncate">{user.name}</span>
              </label>
            ))}
          </div>
          <FormError message={assign.error?.message} />
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={chosen.length === 0 || assign.isPending}
              onClick={() => assign.mutate({ accountIds, userIds: chosen })}
            >
              {assign.isPending
                ? 'Assigning…'
                : chosen.length > 1
                  ? `Assign in turns to ${chosen.length} people`
                  : 'Assign'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/**
 * What can be done with many companies at once, above the Accounts list: choose this page or
 * everything the filters match, then make a bundle, assign, or take them out as a file.
 * @param {{ pageIds: string[], filters: object, total: number, users: object[],
 *           selected: string[], onChange: (ids: string[]) => void }} props
 */
export default function AccountsBulkBar({ pageIds, filters, total, users, selected, onChange }) {
  const can = useCan();
  const { allIds, exportSelected } = useAccountsBulk();
  const [dialog, setDialog] = useState(null);
  const isPageChosen = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const count = selected.length;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        className={smallButton}
        onClick={() =>
          onChange(
            isPageChosen
              ? selected.filter((id) => !pageIds.includes(id))
              : [...new Set([...selected, ...pageIds])],
          )
        }
      >
        {isPageChosen ? 'Unselect this page' : `Select this page (${pageIds.length})`}
      </button>
      {total > pageIds.length && (
        <button
          type="button"
          className={smallButton}
          disabled={allIds.isPending}
          onClick={() =>
            allIds.mutate(filters, { onSuccess: (payload) => onChange(payload.data.ids) })
          }
        >
          {allIds.isPending ? 'Selecting…' : `Select all ${total} that match`}
        </button>
      )}
      {count > 0 && (
        <>
          <button type="button" className={smallButton} onClick={() => onChange([])}>
            Clear
          </button>
          <span className="font-medium">{count} selected</span>
          {can('campaigns', 'create') && (
            <button type="button" className={smallButton} onClick={() => setDialog('bundle')}>
              <Layers size={12} aria-hidden="true" />
              Make a bundle
            </button>
          )}
          {can('accounts', 'assign') && (
            <button type="button" className={smallButton} onClick={() => setDialog('assign')}>
              <UserPlus size={12} aria-hidden="true" />
              Assign
            </button>
          )}
          {can('accounts', 'export') && (
            <button
              type="button"
              className={smallButton}
              disabled={exportSelected.isPending}
              onClick={() => exportSelected.mutate(selected)}
            >
              <Download size={12} aria-hidden="true" />
              {exportSelected.isPending ? 'Preparing…' : 'Export selected'}
            </button>
          )}
        </>
      )}
      {allIds.data?.data.isCut && (
        <span className="text-xs text-text-muted">
          Only the first {allIds.data.data.ids.length} were selected; narrow the filters for the
          rest.
        </span>
      )}
      <FormError message={allIds.error?.message ?? exportSelected.error?.message} />
      {dialog === 'bundle' && (
        <BundleDialog accountIds={selected} onClose={() => setDialog(null)} />
      )}
      {dialog === 'assign' && (
        <AssignDialog
          accountIds={selected}
          users={users}
          onClose={() => {
            setDialog(null);
            onChange([]);
          }}
        />
      )}
    </div>
  );
}
