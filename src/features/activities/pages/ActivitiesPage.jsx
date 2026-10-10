import { useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  primaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useTaskOptions, useTaskSummary, useTasks } from '../api.js';
import { TaskDialog, TaskList } from '../components/Tasks.jsx';

const VIEWS = [
  { id: 'today', label: 'Today', empty: 'Nothing is due today.' },
  { id: 'upcoming', label: 'Upcoming', empty: 'Nothing is planned after today.' },
  { id: 'overdue', label: 'Overdue', empty: 'Nothing is overdue. Well done.' },
  { id: 'completed', label: 'Completed', empty: 'No finished tasks yet.' },
];

// Activities: the tasks, follow-ups and reminders, in four views. Everyone sees their own
// tasks; a manager also their team's, the CEO everyone's (the server decides that).
// The view, the search and the page are kept in the address.
export default function ActivitiesPage() {
  const can = useCan();
  const list = useListParams(['view', 'search', 'assigneeId']);
  const [isAdding, setIsAdding] = useState(false);
  const view = VIEWS.find((item) => item.id === list.values.view) ?? VIEWS[0];
  const { search, assigneeId } = list.values;

  const options = useTaskOptions();
  const summary = useTaskSummary();
  const tasks = useTasks({ view: view.id, search, assigneeId, page: list.page });
  const rows = tasks.data?.data ?? [];
  const users = options.data?.users ?? [];

  const chips = [
    search && {
      key: 'search',
      label: `Search: ${search}`,
      onRemove: () => list.setFilters({ search: '' }),
    },
    assigneeId && {
      key: 'assigneeId',
      label: `For: ${users.find((user) => user.id === assigneeId)?.name ?? 'Chosen'}`,
      onRemove: () => list.setFilters({ assigneeId: '' }),
    },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Activities" description="Tasks, follow-ups and reminders.">
        {can('tasks', 'create') && (
          <button type="button" onClick={() => setIsAdding(true)} className={primaryButtonClass}>
            <Plus size={16} aria-hidden="true" />
            New task
          </button>
        )}
      </PageHeader>

      <div
        role="tablist"
        aria-label="Task views"
        className="mb-4 flex flex-wrap gap-1 border-b border-border"
      >
        {VIEWS.map((item) => {
          const isCurrent = item.id === view.id;
          // My own open tasks in that view.
          const count = summary.data?.[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => list.setFilters({ view: item.id === VIEWS[0].id ? '' : item.id })}
              className={[
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand',
                isCurrent
                  ? 'border-brand text-brand-text'
                  : 'border-transparent text-text-muted hover:text-text',
              ].join(' ')}
            >
              {item.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs ${item.id === 'overdue' ? 'bg-danger text-on-brand' : 'border border-border'}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <FilterBar
        search={{
          value: search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Search tasks',
          label: 'Search tasks',
        }}
        chips={chips}
        onClearAll={() => list.setFilters({ search: '', assigneeId: '' })}
      >
        {options.data?.canAssign && users.length > 1 && (
          <select
            aria-label="Filter by person"
            value={assigneeId}
            onChange={(event) => list.setFilters({ assigneeId: event.target.value })}
            className={compactInputClass}
          >
            <option value="">Everyone I may see</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}
      </FilterBar>

      <FormError message={tasks.error?.message} />
      {tasks.isPending && (
        <p role="status" className="p-4 text-text-muted">
          Loading tasks…
        </p>
      )}
      {tasks.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title={chips.length > 0 ? 'No tasks match' : view.empty}
          description={
            chips.length > 0
              ? 'Change or clear the search and the filter.'
              : 'Add a task here, or from a lead or a company to keep it with that record.'
          }
        />
      )}
      {rows.length > 0 && <TaskList tasks={rows} />}
      <Pagination meta={tasks.data?.meta} noun={['task', 'tasks']} onPageChange={list.setPage} />

      {isAdding && <TaskDialog onClose={() => setIsAdding(false)} />}
    </>
  );
}
