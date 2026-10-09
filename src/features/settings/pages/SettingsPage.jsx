import { useState } from 'react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useRoles, useUpdateRole } from '../api.js';
import PermissionMatrix, { grantsToMap, mapToGrants } from '../components/PermissionMatrix.jsx';

// The editor for one account type. Rendered with key={role.id}, so switching to another
// account type starts from that type's saved permissions.
function RoleEditor({ role, catalogue, canEdit }) {
  const saved = grantsToMap(role.grants);
  const [draft, setDraft] = useState(saved);
  const updateRole = useUpdateRole();

  const changedCount = [...new Set([...Object.keys(saved), ...Object.keys(draft)])].filter(
    (key) => (saved[key] ?? '') !== (draft[key] ?? ''),
  ).length;

  function save() {
    updateRole.mutate({ id: role.id, grants: mapToGrants(draft) });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted">
          {role.description} · {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
        </p>
        {canEdit && (
          <div className="flex items-center gap-2">
            {changedCount > 0 && (
              <span className="text-sm text-text-muted">
                {changedCount} {changedCount === 1 ? 'change' : 'changes'} not saved
              </span>
            )}
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={changedCount === 0 || updateRole.isPending}
              onClick={() => setDraft(saved)}
            >
              Reset
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={changedCount === 0 || updateRole.isPending}
              onClick={save}
            >
              {updateRole.isPending ? 'Saving…' : 'Save permissions'}
            </button>
          </div>
        )}
      </div>

      <FormError message={updateRole.error?.message} />
      {updateRole.isSuccess && changedCount === 0 && (
        <p role="status" className="text-sm text-success">
          Saved. The change applies to these users from their next click.
        </p>
      )}

      <PermissionMatrix
        catalogue={catalogue}
        value={draft}
        savedValue={saved}
        onChange={setDraft}
        disabled={!canEdit || updateRole.isPending}
      />

      <p className="text-sm text-text-muted">
        Own: records the user owns. Assigned: owned or assigned to the user. Team: the user and the
        people who report to them. All: every record.
      </p>
    </section>
  );
}

// Settings. The first section is Roles and permissions: what each account type may do.
// More sections (branding, stages, tags, integrations) are added by later tasks.
export default function SettingsPage() {
  const can = useCan();
  const roles = useRoles();
  const [selectedId, setSelectedId] = useState(null);

  const list = roles.data?.roles ?? [];
  const selected = list.find((role) => role.id === selectedId) ?? list[0];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Roles and permissions: what each account type can see and do."
      />
      <FormError message={roles.error?.message} />
      {roles.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}

      {selected && (
        <>
          <div role="tablist" aria-label="Account types" className="mb-4 flex flex-wrap gap-2">
            {list.map((role) => {
              const isSelected = role.id === selected.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(role.id)}
                  className={[
                    'rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand',
                    isSelected
                      ? 'border-brand bg-brand-soft text-brand-text'
                      : 'border-border bg-surface hover:border-text-muted',
                  ].join(' ')}
                >
                  {role.name}
                </button>
              );
            })}
          </div>
          <RoleEditor
            key={selected.id}
            role={selected}
            catalogue={roles.data.catalogue}
            canEdit={can('settings', 'edit')}
          />
        </>
      )}
    </>
  );
}
