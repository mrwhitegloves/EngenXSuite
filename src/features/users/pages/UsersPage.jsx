import { useState } from 'react';
import { Eye, Pencil, Plus, UserCheck, UserX, Users } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Avatar from '../../../components/shared/Avatar.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  primaryButtonClass,
  compactInputClass,
} from '../../../components/shared/form.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useUpdateUser, useUsers } from '../api.js';
import UserFormDialog from '../components/UserFormDialog.jsx';
import ViewPasswordDialog from '../components/ViewPasswordDialog.jsx';

const STATUS_STYLES = {
  active: 'text-success',
  invited: 'text-warning',
  deactivated: 'text-text-muted',
};
const STATUS_LABELS = { active: 'Active', invited: 'Invited', deactivated: 'Deactivated' };
const FILTER_KEYS = ['search', 'status'];

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
  const list = useListParams(FILTER_KEYS);
  // null = closed, 'new' = the create form, or the user being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const users = useUsers({ page: list.page, sort: list.sort, ...list.values });
  const updateUser = useUpdateUser();

  const rows = users.data?.data ?? [];
  const { search, status } = list.values;

  // Someone who manages ALL users may also edit their own account; a manager may not.
  const managesAllUsers = me.grants.some(
    (grant) => grant.feature === 'users' && grant.action === 'edit' && grant.scope === 'all',
  );

  const chips = [
    search && {
      key: 'search',
      label: `Search: ${search}`,
      onRemove: () => list.setFilters({ search: '' }),
    },
    status && {
      key: 'status',
      label: `Status: ${STATUS_LABELS[status] ?? status}`,
      onRemove: () => list.setFilters({ status: '' }),
    },
  ].filter(Boolean);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} url={row.avatarUrl} />
          <div>
            <p className="font-medium">
              {row.name}
              {row.id === me.id && <span className="ml-2 text-xs text-text-muted">(you)</span>}
            </p>
            <p className="text-text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Account type', render: (row) => row.role.name },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (row) => (
        <span className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status]}</span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last sign-in',
      sortKey: 'lastLoginAt',
      className: 'text-text-muted whitespace-nowrap',
      render: (row) => formatDate(row.lastLoginAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      render: (row) => {
        const isMe = row.id === me.id;
        const isActive = row.status !== 'deactivated';
        if (!can('users', 'edit') || (isMe && !managesAllUsers)) return null;
        return (
          <div className="flex justify-end gap-2">
            <button type="button" className={rowButton} onClick={() => setFormTarget(row)}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
            <button type="button" className={rowButton} onClick={() => setViewTarget(row)}>
              <Eye size={14} aria-hidden="true" />
              Show password
            </button>
            {!isMe && isActive && (
              <button type="button" className={rowButton} onClick={() => setDeactivateTarget(row)}>
                <UserX size={14} aria-hidden="true" />
                Deactivate
              </button>
            )}
            {!isMe && !isActive && (
              <button
                type="button"
                className={rowButton}
                disabled={updateUser.isPending}
                onClick={() => updateUser.mutate({ id: row.id, status: 'active' })}
              >
                <UserCheck size={14} aria-hidden="true" />
                Activate
              </button>
            )}
          </div>
        );
      },
    },
  ];

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

      <FilterBar
        search={{
          value: search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Search name or email',
          label: 'Search users',
        }}
        chips={chips}
        onClearAll={list.clearFilters}
        savedViews={{ screen: 'users', currentQuery: list.viewQuery, onApply: list.applyView }}
      >
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => list.setFilters({ status: event.target.value })}
          className={`${compactInputClass}`}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </FilterBar>

      <FormError
        message={users.error?.message ?? (deactivateTarget ? null : updateUser.error?.message)}
      />

      {users.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading users…
        </p>
      )}

      {users.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title={list.hasFilters ? 'No users match these filters' : 'No users yet'}
          description={
            list.hasFilters
              ? 'Change the search or the status filter.'
              : 'Create the first user account.'
          }
        />
      )}

      {rows.length > 0 && (
        <DataTable
          caption="Users"
          columns={columns}
          rows={rows}
          sort={list.sort}
          onSortChange={list.setSort}
          isRefreshing={users.isPlaceholderData}
        />
      )}

      <Pagination meta={users.data?.meta} noun={['user', 'users']} onPageChange={list.setPage} />

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
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate this user?"
        confirmLabel="Deactivate"
        isBusy={updateUser.isPending}
        error={updateUser.error?.message}
        onClose={() => {
          updateUser.reset();
          setDeactivateTarget(null);
        }}
        onConfirm={() =>
          updateUser.mutate(
            { id: deactivateTarget.id, status: 'deactivated' },
            { onSuccess: () => setDeactivateTarget(null) },
          )
        }
      >
        <p>
          <strong>{deactivateTarget?.name}</strong> will be signed out at once and cannot sign in
          again until the account is activated. Their records stay as they are.
        </p>
      </ConfirmDialog>
    </>
  );
}
