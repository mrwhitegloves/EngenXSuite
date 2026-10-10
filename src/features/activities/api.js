import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// The timeline, notes and tasks. Cached answers live under 'timeline' and 'tasks', which the
// live "activities.changed" and "tasks.changed" events make stale.
const TIMELINE_KEY = ['timeline'];
const TASKS_KEY = ['tasks'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * The timeline of one company, lead or contact, newest first.
 * @param {{ accountId?: string, opportunityId?: string, contactId?: string }} target  One of them
 * @param {{ type?: string, page?: number, pageSize?: number }} [options]
 */
export function useTimeline(target, options = {}) {
  const params = { ...target, ...options };
  return useQuery({
    queryKey: [...TIMELINE_KEY, params],
    queryFn: ({ signal }) => apiRequest(`/timeline${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** Write, change and remove notes. Each one reloads the timelines. */
export function useNoteActions() {
  const queryClient = useQueryClient();
  const action = (mutationFn) => ({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIMELINE_KEY }),
  });
  return {
    create: useMutation(action((body) => apiRequest('/notes', { method: 'POST', body }))),
    update: useMutation(
      action(({ id, content }) =>
        apiRequest(`/notes/${id}`, { method: 'PATCH', body: { content } }),
      ),
    ),
    remove: useMutation(action((id) => apiRequest(`/notes/${id}`, { method: 'DELETE' }))),
  };
}

/** Tasks. `params`: view, page, search, assigneeId, or opportunityId / accountId. */
export function useTasks(params) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/tasks${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** How many open tasks I have today, overdue and upcoming. */
export function useTaskSummary() {
  return useQuery({
    queryKey: [...TASKS_KEY, 'summary'],
    queryFn: ({ signal }) => apiRequest('/tasks/summary', { signal }),
    select: (payload) => payload.data,
  });
}

/** The people a task can be given to, and the kinds and priorities of a task. */
export function useTaskOptions() {
  return useQuery({
    queryKey: [...TASKS_KEY, 'form-options'],
    queryFn: ({ signal }) => apiRequest('/tasks/form-options', { signal }),
    select: (payload) => payload.data,
  });
}

/** Add, change (also: complete, reopen) and delete tasks. A task event shows on the timeline. */
export function useTaskActions() {
  const queryClient = useQueryClient();
  const action = (mutationFn) => ({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: TIMELINE_KEY });
    },
  });
  return {
    create: useMutation(action((body) => apiRequest('/tasks', { method: 'POST', body }))),
    update: useMutation(
      action(({ id, ...body }) => apiRequest(`/tasks/${id}`, { method: 'PATCH', body })),
    ),
    remove: useMutation(action((id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }))),
  };
}
