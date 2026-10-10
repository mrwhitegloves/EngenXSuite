import { useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import DateRangeFilter, {
  DATE_PRESET_LABELS,
  dateRangeParams,
} from '../../../components/shared/DateRangeFilter.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, inputClass, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useAccountOptions, useAccounts, useDeleteAccount } from '../api.js';
import AccountFormDialog from '../components/AccountFormDialog.jsx';

const FILTER_KEYS = ['search', 'statusId', 'industry', 'region', 'ownerId', 'range', 'from', 'to'];

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(
    new Date(value),
  );
}

// Accounts: the customer companies. Everyone sees only the accounts inside their own scope;
// the server decides that, this screen only shows what it is given.
export default function AccountsPage() {
  const can = useCan();
  const list = useListParams(FILTER_KEYS);
  // null = closed, 'new' = the create form, or the id of the account being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { search, statusId, industry, region, ownerId, range, from, to } = list.values;
  const dates = { range, from, to };
  const options = useAccountOptions();
  const accounts = useAccounts({
    page: list.page,
    sort: list.sort,
    search,
    statusId,
    industry,
    region,
    ownerId,
    ...dateRangeParams(dates),
  });
  const deleteAccount = useDeleteAccount();

  const rows = accounts.data?.data ?? [];
  const statuses = options.data?.statuses ?? [];
  const users = options.data?.users ?? [];
  const nameOf = (items, id) => items.find((item) => item.id === id)?.name ?? 'Chosen';

  const chip = (key, label, clear = { [key]: '' }) => ({
    key,
    label,
    onRemove: () => list.setFilters(clear),
  });
  const chips = [
    search && chip('search', `Search: ${search}`),
    statusId && chip('statusId', `Status: ${nameOf(statuses, statusId)}`),
    industry && chip('industry', `Industry: ${industry}`),
    region && chip('region', `Region: ${region}`),
    ownerId && chip('ownerId', `Owner: ${nameOf(users, ownerId)}`),
    range &&
      chip(
        'range',
        range === 'custom' && from && to
          ? `Created: ${from} to ${to}`
          : `Created: ${DATE_PRESET_LABELS[range] ?? range}`,
        { range: '', from: '', to: '' },
      ),
  ].filter(Boolean);

  const columns = [
    {
      key: 'accountCode',
      header: 'Code',
      sortKey: 'accountCode',
      className: 'font-mono text-xs whitespace-nowrap text-text-muted',
      render: (row) => row.accountCode,
    },
    {
      key: 'name',
      header: 'Company',
      sortKey: 'name',
      render: (row) => (
        <>
          {/* The name opens the account's own page. */}
          <Link
            to={`/accounts/${row.id}`}
            className="font-medium hover:text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {row.name}
          </Link>
          <p className="text-text-muted">
            {[row.industry, row.city].filter(Boolean).join(' · ') || '—'}
          </p>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className="rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap">
          {row.status?.name ?? '—'}
        </span>
      ),
    },
    { key: 'owner', header: 'Owner', render: (row) => row.owner?.name ?? '—' },
    {
      key: 'lastActivityAt',
      header: 'Last activity',
      sortKey: 'lastActivityAt',
      className: 'whitespace-nowrap text-text-muted',
      render: (row) => formatDate(row.lastActivityAt),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortKey: 'createdAt',
      className: 'whitespace-nowrap text-text-muted',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('accounts', 'edit') && (
            <button type="button" className={rowButton} onClick={() => setFormTarget(row.id)}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          )}
          {can('accounts', 'delete') && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Delete ${row.name}`}
              onClick={() => {
                deleteAccount.reset();
                setDeleteTarget(row);
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterSelect = (key, label, emptyLabel, choices) => (
    <select
      aria-label={label}
      value={list.values[key]}
      onChange={(event) => list.setFilters({ [key]: event.target.value })}
      className={`${inputClass} w-auto`}
    >
      <option value="">{emptyLabel}</option>
      {choices.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <PageHeader title="Accounts" description="The companies you sell to.">
        {can('accounts', 'create') && (
          <button type="button" onClick={() => setFormTarget('new')} className={primaryButtonClass}>
            <Plus size={16} aria-hidden="true" />
            New account
          </button>
        )}
      </PageHeader>

      <FilterBar
        search={{
          value: search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Search name, code or city',
          label: 'Search accounts',
        }}
        chips={chips}
        onClearAll={list.clearFilters}
        savedViews={{ screen: 'accounts', currentQuery: list.viewQuery, onApply: list.applyView }}
      >
        {filterSelect(
          'statusId',
          'Filter by status',
          'All statuses',
          statuses.map((status) => [status.id, status.name]),
        )}
        {(options.data?.industries.length ?? 0) > 0 &&
          filterSelect(
            'industry',
            'Filter by industry',
            'All industries',
            options.data.industries.map((item) => [item, item]),
          )}
        {(options.data?.regions.length ?? 0) > 0 &&
          filterSelect(
            'region',
            'Filter by region',
            'All regions',
            options.data.regions.map((item) => [item, item]),
          )}
        {users.length > 1 &&
          filterSelect(
            'ownerId',
            'Filter by owner',
            'All owners',
            users.map((user) => [user.id, user.name]),
          )}
        <DateRangeFilter label="Created" value={dates} onChange={list.setFilters} />
      </FilterBar>

      <FormError message={accounts.error?.message ?? options.error?.message} />

      {accounts.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading accounts…
        </p>
      )}

      {accounts.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Building2}
          title={list.hasFilters ? 'No accounts match these filters' : 'No accounts yet'}
          description={
            list.hasFilters
              ? 'Change or clear the filters.'
              : 'Add the first company with “New account”, or with “New” in the top bar to add its people too.'
          }
        />
      )}

      {rows.length > 0 && (
        <DataTable
          caption="Accounts"
          columns={columns}
          rows={rows}
          sort={list.sort}
          onSortChange={list.setSort}
          isRefreshing={accounts.isPlaceholderData}
        />
      )}

      <Pagination
        meta={accounts.data?.meta}
        noun={['account', 'accounts']}
        onPageChange={list.setPage}
      />

      {formTarget && (
        <AccountFormDialog
          key={formTarget}
          accountId={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this account?"
        confirmLabel="Delete"
        isBusy={deleteAccount.isPending}
        error={deleteAccount.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteAccount.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> ({deleteTarget?.accountCode}) and its people will
          disappear from every screen. Its history is kept, and its code is not used again.
        </p>
      </ConfirmDialog>
    </>
  );
}
