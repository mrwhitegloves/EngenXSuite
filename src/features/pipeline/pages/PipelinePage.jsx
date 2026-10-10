import { useState } from 'react';
import { KanbanSquare, Plus } from 'lucide-react';
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
import { useLeadOptions, useLeads } from '../api.js';
import LeadEditModal from '../components/LeadEditModal.jsx';
import LeadsTable from '../components/LeadsTable.jsx';

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

// Pipeline: the leads. Everyone sees only the leads inside their own scope (an agent: only
// the leads assigned to them); the server decides that, this screen shows what it is given.
export default function PipelinePage() {
  const can = useCan();
  const list = useListParams(FILTER_KEYS);
  const [isCreating, setIsCreating] = useState(false);

  const { search, status, stageId, leadStatusId, ownerId, solutionCategoryId, tagId } = list.values;
  const dates = { range: list.values.range, from: list.values.from, to: list.values.to };
  const options = useLeadOptions();
  const tags = useTagsFor('opportunity');
  const leads = useLeads({
    page: list.page,
    sort: list.sort,
    search,
    status,
    stageId,
    leadStatusId,
    ownerId,
    solutionCategoryId,
    tagId,
    ...dateRangeParams(dates),
  });

  const rows = leads.data?.data ?? [];
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
    stageId && chip('stageId', `Stage: ${nameOf(stages, stageId)}`),
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
        {filterSelect(
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

      <FormError message={leads.error?.message ?? options.error?.message} />

      {leads.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading leads…
        </p>
      )}

      {leads.isSuccess && rows.length === 0 && (
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

      {rows.length > 0 && (
        <LeadsTable
          caption="Leads"
          rows={rows}
          stages={stages}
          sort={list.sort}
          onSortChange={list.setSort}
          isRefreshing={leads.isPlaceholderData}
        />
      )}

      <Pagination meta={leads.data?.meta} noun={['lead', 'leads']} onPageChange={list.setPage} />

      {isCreating && <LeadEditModal onClose={() => setIsCreating(false)} />}
    </>
  );
}
