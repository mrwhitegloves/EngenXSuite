import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { compactInputClass, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useGeneratedActions, useGeneratedList } from '../api.js';
import { DOC_KINDS, kindByPath } from '../kinds.js';

const dateTime = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/** Choosing the template of a new document (only asked when a kind has more than one). */
function TemplatePicker({ kind, open, onClose, onPick }) {
  return (
    <Dialog open={open} title={`New ${kind.one}`} onClose={onClose}>
      <ul className="space-y-2">
        {kind.templates.map((template) => (
          <li key={template.key}>
            <button
              type="button"
              onClick={() => onPick(template)}
              className="w-full rounded-md border border-border p-3 text-left hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="block font-medium">{template.name}</span>
              <span className="block text-sm text-text-muted">{template.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** The documents of one kind, with search, paging, open and delete. */
export default function GeneratorListPage() {
  const { kindPath } = useParams();
  const kind = kindByPath(kindPath);
  const can = useCan();
  const navigate = useNavigate();
  const list = useListParams(['search']);
  const [search, setSearch] = useState(list.values.search);
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const kinds = DOC_KINDS.filter((item) => can(item.feature));
  const { data, isLoading, isFetching, error } = useGeneratedList(kindPath, {
    search: list.values.search,
    page: list.page,
  });
  const { remove } = useGeneratedActions(kindPath);

  // The search box writes to the address a moment after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== list.values.search) list.setFilters({ search });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, list]);

  if (!kind || !can(kind.feature)) {
    const first = kinds[0];
    return first ? (
      <Link to={`/generator/${first.path}`} className="text-brand underline">
        Open {first.label}
      </Link>
    ) : null;
  }

  const startNew = (template) =>
    navigate(`/generator/${kind.path}/new?template=${encodeURIComponent(template.key)}`);
  const onNew = () =>
    kind.templates.length === 1 ? startNew(kind.templates[0]) : setPicking(true);
  const mayCreate = can(kind.feature, 'create') && kind.templates.length > 0;

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortKey: 'title',
      render: (row) => (
        <Link
          to={`/generator/${kind.path}/${row.id}`}
          className="font-medium hover:text-brand hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    { key: 'clientName', header: 'Client', render: (row) => row.clientName || '—' },
    { key: 'refNo', header: 'Reference', render: (row) => row.refNo || '—' },
    {
      key: 'updatedAt',
      header: 'Last saved',
      sortKey: 'updatedAt',
      render: (row) => <span className="whitespace-nowrap">{dateTime(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      className: 'w-10 text-right',
      render: (row) =>
        can(kind.feature, 'delete') ? (
          <button
            type="button"
            onClick={() => setDeleting(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-page hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
            aria-label={`Delete ${row.title}`}
          >
            <Trash2 size={15} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document generator"
        description="Fill in a template on the left, see the document on the right, save it and download the PDF."
      >
        {mayCreate && (
          <button type="button" className={primaryButtonClass} onClick={onNew}>
            <Plus size={16} /> New {kind.one}
          </button>
        )}
      </PageHeader>

      <nav aria-label="Kinds of document" className="flex gap-1 border-b border-border">
        {kinds.map((item) => (
          <NavLink
            key={item.key}
            to={`/generator/${item.path}`}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-muted hover:text-text'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {kind.templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`${kind.label}: template coming next`}
          description={`Send the ${kind.one} format you use today; it becomes a template here like the proposal.`}
        />
      ) : (
        <>
          <input
            type="search"
            className={`${compactInputClass} w-full max-w-sm`}
            placeholder="Search title, client or reference"
            aria-label={`Search ${kind.label.toLowerCase()}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {error && <p className="text-danger">{error.message}</p>}
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={
                list.values.search
                  ? `No ${kind.one} matches this search`
                  : `No ${kind.label.toLowerCase()} yet`
              }
              description={`A ${kind.one} you save appears here.`}
              action={
                mayCreate && !list.values.search ? (
                  <button type="button" className={primaryButtonClass} onClick={onNew}>
                    <Plus size={16} /> New {kind.one}
                  </button>
                ) : null
              }
            />
          ) : (
            <>
              <DataTable
                caption={kind.label}
                columns={columns}
                rows={data?.data ?? []}
                sort={list.sort}
                onSortChange={list.setSort}
                isRefreshing={isFetching && !isLoading}
              />
              <Pagination
                meta={data?.meta}
                noun={[kind.one, kind.label.toLowerCase()]}
                onPageChange={list.setPage}
              />
            </>
          )}
        </>
      )}

      <TemplatePicker
        kind={kind}
        open={picking}
        onClose={() => setPicking(false)}
        onPick={startNew}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete this ${kind.one}?`}
        confirmLabel="Delete"
        isBusy={remove.isPending}
        error={remove.error?.message}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      >
        &ldquo;{deleting?.title}&rdquo; is removed for good. A PDF you downloaded stays as it is.
      </ConfirmDialog>
    </div>
  );
}
