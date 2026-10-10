import { useState } from 'react';
import { KanbanSquare, List, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import DateRangeFilter, {
  DATE_PRESET_LABELS,
  dateRangeParams,
} from '../../../components/shared/DateRangeFilter.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  primaryButtonClass,
  compactInputClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useTagsFor } from '../../../hooks/useTags.js';
import { useBoard, useLeadOptions, useLeads } from '../api.js';
import LeadEditModal from '../components/LeadEditModal.jsx';
import LeadsTable from '../components/LeadsTable.jsx';
import PipelineBoard from '../components/PipelineBoard.jsx';

const FILTER_KEYS = [
  'search',
  'status',
  'stageId',
  'leadStatusId',
  'ownerId',
  'solutionCategoryId',
  'tagId',
  'range',
  'from',
  'to',
];
const STATE_LABELS = { open: 'Open', won: 'Won', lost: 'Lost' };

const VIEWS = [
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'table', label: 'Table', icon: List },
];

// Pipeline: the leads, as a board (one column per stage) or as a table. The chosen view is
// kept in the address, like the filters. Everyone sees only the leads inside their own scope (an agent: only
// the leads assigned to them); the server decides that, this screen shows what it is given.
export default function PipelinePage() {
  const can = useCan();
  const list = useListParams(FILTER_KEYS);
  const [isCreating, setIsCreating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const isTable = searchParams.get('view') === 'table';
  function showView(id) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (id === 'table') next.set('view', 'table');
      else next.delete('view');
      // The board has no pages and its own order.
      next.delete('page');
      return next;
    });
  }

  const { search, status, stageId, leadStatusId, ownerId, solutionCategoryId, tagId } = list.values;
  const dates = { range: list.values.range, from: list.values.from, to: list.values.to };
  const options = useLeadOptions();
  const tags = useTagsFor('opportunity');
  // The same filters for both views; only the table has a stage filter, a sort and pages.
  const filters = {
    search,
    status,
    leadStatusId,
    ownerId,
    solutionCategoryId,
    tagId,
    ...dateRangeParams(dates),
  };
  const leads = useLeads(
    { page: list.page, sort: list.sort, stageId, ...filters },
    { enabled: isTable },
  );
  const board = useBoard(filters, { enabled: !isTable });
  const current = isTable ? leads : board;

  const rows = leads.data?.data ?? [];
  const columns = board.data ?? [];
  const isEmpty = isTable
    ? rows.length === 0
    : columns.every((column) => column.count === 0) && !list.hasFilters;
  const stages = options.data?.stages ?? [];
  const statuses = options.data?.leadStatuses ?? [];
  const categories = options.data?.solutionCategories ?? [];
  const users = options.data?.users ?? [];
  const nameOf = (items, id) => items.find((item) => item.id === id)?.name ?? 'Chosen';

  const chip = (key, label, clear = { [key]: '' }) => ({
    key,
    label,
    onRemove: () => list.setFilters(clear),
  });
  const chips = [
    search && chip('search', `Search: ${search}`),
    status && chip('status', STATE_LABELS[status] ?? status),
    isTable && stageId && chip('stageId', `Stage: ${nameOf(stages, stageId)}`),
    leadStatusId && chip('leadStatusId', `Status: ${nameOf(statuses, leadStatusId)}`),
    ownerId &&
      chip('ownerId', ownerId === 'unassigned' ? 'Unassigned' : `Owner: ${nameOf(users, ownerId)}`),
    solutionCategoryId &&
      chip('solutionCategoryId', `Solution: ${nameOf(categories, solutionCategoryId)}`),
    tagId && chip('tagId', `Tag: ${nameOf(tags, tagId)}`),
    dates.range &&
      chip(
        'range',
        dates.range === 'custom' && dates.from && dates.to
          ? `Created: ${dates.from} to ${dates.to}`
          : `Created: ${DATE_PRESET_LABELS[dates.range] ?? dates.range}`,
        { range: '', from: '', to: '' },
      ),
  ].filter(Boolean);

  const filterSelect = (key, label, emptyLabel, choices) => (
    <select
      aria-label={label}
      value={list.values[key]}
      onChange={(event) => list.setFilters({ [key]: event.target.value })}
      className={`${compactInputClass}`}
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
      <PageHeader title="Pipeline" description="Your leads, from the first contact to won or lost.">
        <div role="group" aria-label="View" className="inline-flex rounded-md border border-border">
          {VIEWS.map((view) => {
            const isCurrent = (view.id === 'table') === isTable;
            return (
              <button
                key={view.id}
                type="button"
                aria-pressed={isCurrent}
                onClick={() => showView(view.id)}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium first:rounded-l-md last:rounded-r-md focus-visible:outline-2 focus-visible:outline-brand',
                  isCurrent ? 'bg-brand-soft text-brand-text' : 'bg-surface text-text-muted',
                ].join(' ')}
              >
                <view.icon size={16} aria-hidden="true" />
                {view.label}
              </button>
            );
          })}
        </div>
        {can('opportunities', 'create') && (
          <button type="button" onClick={() => setIsCreating(true)} className={primaryButtonClass}>
            <Plus size={16} aria-hidden="true" />
            New lead
          </button>
        )}
      </PageHeader>

      <FilterBar
        search={{
          value: search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Search lead name or code',
          label: 'Search leads',
        }}
        chips={chips}
        onClearAll={list.clearFilters}
        savedViews={{ screen: 'pipeline', currentQuery: list.viewQuery, onApply: list.applyView }}
      >
        {filterSelect(
          'status',
          'Filter by open or closed',
          'Open and closed',
          Object.entries(STATE_LABELS),
        )}
        {isTable &&
          filterSelect(
            'stageId',
            'Filter by stage',
            'All stages',
            stages.map((stage) => [stage.id, stage.name]),
          )}
        {filterSelect(
          'leadStatusId',
          'Filter by status',
          'All statuses',
          statuses.map((item) => [item.id, item.name]),
        )}
        {options.data?.canAssign &&
          filterSelect('ownerId', 'Filter by owner', 'All owners', [
            ['unassigned', 'Unassigned'],
            ...users.map((user) => [user.id, user.name]),
          ])}
        {filterSelect(
          'solutionCategoryId',
          'Filter by solution',
          'All solutions',
          categories.map((item) => [item.id, item.name]),
        )}
        {tags.length > 0 &&
          filterSelect(
            'tagId',
            'Filter by tag',
            'All tags',
            tags.map((tag) => [tag.id, tag.name]),
          )}
        <DateRangeFilter label="Created" value={dates} onChange={list.setFilters} />
      </FilterBar>

      <FormError message={current.error?.message ?? options.error?.message} />

      {current.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading leads…
        </p>
      )}

      {current.isSuccess && isEmpty && (
        <EmptyState
          icon={KanbanSquare}
          title={list.hasFilters ? 'No leads match these filters' : 'No leads yet'}
          description={
            list.hasFilters
              ? 'Change or clear the filters.'
              : 'Add the first one with “New lead”. A lead belongs to a company from Accounts.'
          }
        />
      )}

      {!isTable && board.isSuccess && !isEmpty && <PipelineBoard columns={columns} />}

      {isTable && rows.length > 0 && (
        <LeadsTable
          caption="Leads"
          rows={rows}
          stages={stages}
          sort={list.sort}
          onSortChange={list.setSort}
          isRefreshing={leads.isPlaceholderData}
        />
      )}

      {isTable && (
        <Pagination meta={leads.data?.meta} noun={['lead', 'leads']} onPageChange={list.setPage} />
      )}

      {isCreating && <LeadEditModal onClose={() => setIsCreating(false)} />}
    </>
  );
}
