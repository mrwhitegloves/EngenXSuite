import { useState } from 'react';
import { Eye, Pencil, Plus, UserCheck, UserX, Users } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Avatar from '../../../components/shared/Avatar.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { useCan } from '../../../hooks/useCan.js';
import { useUpdateUser, useUsers } from '../api.js';
import UserFormDialog from '../components/UserFormDialog.jsx';
import ViewPasswordDialog from '../components/ViewPasswordDialog.jsx';

const STATUS_STYLES = {
  active: 'text-success',
  invited: 'text-warning',
  deactivated: 'text-text-muted',
};
const STATUS_LABELS = { active: 'Active', invited: 'Invited', deactivated: 'Deactivated' };

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

function formatDate(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

// User accounts: who can sign in, with which account type. CEO: everyone. Manager: own team.
export default function UsersPage() {
  const { user: me } = useAuth();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  // null = closed, 'new' = the create form, or the user being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  const users = useUsers({ page, search, status });
  const updateUser = useUpdateUser();

  const rows = users.data?.data ?? [];
  const meta = users.data?.meta;
  const pageCount = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const hasFilters = Boolean(search || status);

  // Someone who manages ALL users may also edit their own account; a manager may not.
  const managesAllUsers = me.grants.some(
    (grant) => grant.feature === 'users' && grant.action === 'edit' && grant.scope === 'all',
  );

  return (
    <>
      <PageHeader title="Users" description="People who can sign in, and their account type.">
        {can('users', 'create') && (
          <button type="button" onClick={() => setFormTarget('new')} className={primaryButtonClass}>
            <Plus size={16} aria-hidden="true" />
            New user
          </button>
        )}
      </PageHeader>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search name or email"
          aria-label="Search users"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} max-w-xs`}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      <FormError message={users.error?.message ?? updateUser.error?.message} />

      {users.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading users…
        </p>
      )}

      {users.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title={hasFilters ? 'No users match these filters' : 'No users yet'}
          description={
            hasFilters
              ? 'Change the search or the status filter.'
              : 'Create the first user account.'
          }
        />
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Account type</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last sign-in</th>
                <th className="px-4 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe = row.id === me.id;
                const isActive = row.status !== 'deactivated';
                const canEditRow = can('users', 'edit') && (!isMe || managesAllUsers);
                return (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.name} url={row.avatarUrl} />
                        <div>
                          <p className="font-medium">
                            {row.name}
                            {isMe && <span className="ml-2 text-xs text-text-muted">(you)</span>}
                          </p>
                          <p className="text-text-muted">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">{row.role.name}</td>
                    <td className={`px-4 py-2 ${STATUS_STYLES[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </td>
                    <td className="px-4 py-2 text-text-muted">{formatDate(row.lastLoginAt)}</td>
                    <td className="px-4 py-2">
                      {canEditRow && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={rowButton}
                            onClick={() => setFormTarget(row)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className={rowButton}
                            onClick={() => setViewTarget(row)}
                          >
                            <Eye size={14} aria-hidden="true" />
                            Show password
                          </button>
                          {!isMe && (
                            <button
                              type="button"
                              className={rowButton}
                              disabled={updateUser.isPending}
                              onClick={() =>
                                updateUser.mutate({
                                  id: row.id,
                                  status: isActive ? 'deactivated' : 'active',
                                })
                              }
                            >
                              {isActive ? (
                                <UserX size={14} aria-hidden="true" />
                              ) : (
                                <UserCheck size={14} aria-hidden="true" />
                              )}
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total > meta.pageSize && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <span className="text-text-muted">
            Page {meta.page} of {pageCount} · {meta.total} users
          </span>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {formTarget && (
        <UserFormDialog
          key={formTarget === 'new' ? 'new' : formTarget.id}
          user={formTarget === 'new' ? null : formTarget}
          isSelf={formTarget !== 'new' && formTarget.id === me.id}
          onClose={() => setFormTarget(null)}
        />
      )}
      {viewTarget && (
        <ViewPasswordDialog
          key={viewTarget.id}
          user={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </>
  );
}
