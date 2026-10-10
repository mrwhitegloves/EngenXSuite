import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
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
import { useTaskActions, useTaskOptions, useTasks } from '../api.js';

const TYPE_LABELS = {
  task: 'Task',
  follow_up: 'Follow-up',
  reminder: 'Reminder',
  call: 'Call',
  meeting: 'Meeting',
};
const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIORITY_CLASS = { high: 'text-danger', medium: 'text-text-muted', low: 'text-text-muted' };
const pad = (number) => String(number).padStart(2, '0');

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

/** A stored moment → the value of a date-and-time input (the browser's own time zone). */
function toMomentInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Add a task (no `task`) or change one.
 * @param {{ task?: object, target?: { opportunityId?: string, accountId?: string },
 *           onClose: () => void }} props
 *        target: what a new task is about, when it is added from a lead or a company
 */
export function TaskDialog({ task, target, onClose }) {
  const isNew = !task;
  const options = useTaskOptions();
  const actions = useTaskActions();
  const save = isNew ? actions.create : actions.update;
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    type: task?.type ?? 'task',
    priority: task?.priority ?? 'medium',
    dueAt: toMomentInput(task?.dueAt),
    assigneeId: task?.assignee?.id ?? '',
  });
  const errors = fieldErrorsFrom(save.error);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  function submit(event) {
    event.preventDefault();
    const body = {
      title: form.title.trim(),
      description: form.description,
      type: form.type,
      priority: form.priority,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      ...(form.assigneeId ? { assigneeId: form.assigneeId } : {}),
    };
    save.mutate(isNew ? { ...body, ...target } : { id: task.id, ...body }, { onSuccess: onClose });
  }

  const select = (field, label, choices) => (
    <Field label={label} error={errors[field]}>
      {(props) => (
        <select {...props} value={form[field]} onChange={set(field)} className={inputClass}>
          {choices.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <Dialog open title={isNew ? 'New task' : 'Edit task'} onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={submit}>
        <Field label="What has to be done?" error={errors.title}>
          {(props) => (
            <input
              {...props}
              value={form.title}
              maxLength={200}
              autoFocus
              onChange={set('title')}
              className={inputClass}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due" error={errors.dueAt} hint="Leave empty when there is no date.">
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={form.dueAt}
                onChange={set('dueAt')}
                className={inputClass}
              />
            )}
          </Field>
          {select('priority', 'Priority', Object.entries(PRIORITY_LABELS))}
          {select('type', 'Kind', Object.entries(TYPE_LABELS))}
          {options.data?.canAssign &&
            select('assigneeId', 'For', [
              ['', 'Me'],
              ...options.data.users.map((user) => [user.id, user.name]),
            ])}
        </div>
        <Field label="Details" error={errors.description}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={set('description')}
              className={inputClass}
            />
          )}
        </Field>
        <FormError message={Object.keys(errors).length === 0 ? save.error?.message : null} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!form.title.trim() || save.isPending}
          >
            {save.isPending ? 'Saving…' : isNew ? 'Add task' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Tasks as a list: tick one to complete it, untick to reopen it.
 * @param {{ tasks: object[], showLinks?: boolean }} props
 *        showLinks: say which lead or company a task is about (not needed on that record's page)
 */
export function TaskList({ tasks, showLinks = true }) {
  const actions = useTaskActions();
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <>
      <FormError message={actions.update.error?.message} />
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {tasks.map((task) => {
          const isDone = task.status === 'done';
          return (
            <li key={task.id} className="flex items-start gap-3 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-brand"
                aria-label={isDone ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
                checked={isDone}
                disabled={!task.permissions.canEdit || actions.update.isPending}
                onChange={() =>
                  actions.update.mutate({ id: task.id, status: isDone ? 'open' : 'done' })
                }
              />
              <div className="min-w-0 flex-1 text-sm">
                <p
                  className={`font-medium break-words ${isDone ? 'text-text-muted line-through' : ''}`}
                >
                  {task.title}
                </p>
                <p className="text-xs text-text-muted">
                  {TYPE_LABELS[task.type]}
                  {task.dueAt && (
                    <>
                      {' · '}
                      <span className={task.isOverdue ? 'font-medium text-danger' : ''}>
                        {task.isOverdue ? 'Overdue: ' : 'Due '}
                        {formatMoment(task.dueAt)}
                      </span>
                    </>
                  )}
                  {' · '}
                  <span className={PRIORITY_CLASS[task.priority]}>
                    {PRIORITY_LABELS[task.priority]} priority
                  </span>
                  {task.assignee && <> · {task.assignee.name}</>}
                  {isDone && task.completedAt && <> · done {formatMoment(task.completedAt)}</>}
                </p>
                {showLinks && (task.lead || task.account) && (
                  <p className="text-xs text-text-muted">
                    {task.lead && (
                      <Link
                        to={`/pipeline/${task.lead.id}`}
                        className="hover:text-brand-text hover:underline"
                      >
                        {task.lead.name}
                      </Link>
                    )}
                    {task.lead && task.account && ' · '}
                    {task.account && (
                      <Link
                        to={`/accounts/${task.account.id}`}
                        className="hover:text-brand-text hover:underline"
                      >
                        {task.account.name}
                      </Link>
                    )}
                  </p>
                )}
                {task.description && (
                  <p className="mt-1 break-words whitespace-pre-line">{task.description}</p>
                )}
              </div>
              <span className="flex shrink-0 gap-1">
                {task.permissions.canEdit && (
                  <button
                    type="button"
                    aria-label={`Edit ${task.title}`}
                    onClick={() => setEditTarget(task)}
                    className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                )}
                {task.permissions.canDelete && (
                  <button
                    type="button"
                    aria-label={`Delete ${task.title}`}
                    onClick={() => {
                      actions.remove.reset();
                      setDeleteTarget(task);
                    }}
                    className="rounded p-1 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {editTarget && (
        <TaskDialog key={editTarget.id} task={editTarget} onClose={() => setEditTarget(null)} />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.title}</strong> will be removed for good.
        </p>
      </ConfirmDialog>
    </>
  );
}

/**
 * The tasks of one lead or one company, with "Add task". Used on those pages.
 * @param {{ target: { opportunityId?: string, accountId?: string } }} props
 */
export function RecordTasks({ target }) {
  const can = useCan();
  const [isAdding, setIsAdding] = useState(false);
  const tasks = useTasks({ ...target, view: 'all', pageSize: 50 });
  const rows = tasks.data?.data ?? [];
  // Open tasks first, finished ones below.
  const ordered = [...rows].sort(
    (a, b) => Number(a.status === 'done') - Number(b.status === 'done'),
  );

  return (
    <section aria-label="Tasks" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Tasks</h2>
        {can('tasks', 'create') && (
          <button type="button" className={secondaryButtonClass} onClick={() => setIsAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            Add task
          </button>
        )}
      </div>
      <FormError message={tasks.error?.message} />
      {tasks.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          No tasks here yet.
        </p>
      )}
      {rows.length > 0 && <TaskList tasks={ordered} showLinks={false} />}
      {isAdding && <TaskDialog target={target} onClose={() => setIsAdding(false)} />}
    </section>
  );
}
