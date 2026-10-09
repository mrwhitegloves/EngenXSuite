import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

const ROLES_KEY = ['roles'];

/** Every account type with its permissions, plus the catalogue of what can be granted. */
export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: ({ signal }) => apiRequest('/roles', { signal }),
    select: (payload) => payload.data,
  });
}

function useRolesMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      // The signed-in user's own permissions may have changed: reload them and the menu.
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useUpdateRole() {
  return useRolesMutation(({ id, ...body }) =>
    apiRequest(`/roles/${id}`, { method: 'PATCH', body }),
  );
}

export function useCreateRole() {
  return useRolesMutation((body) => apiRequest('/roles', { method: 'POST', body }));
}

const JOBS_KEY = ['jobs'];

/** How many background jobs each queue holds. Reloaded every 10 seconds while the page is open. */
export function useJobsOverview() {
  return useQuery({
    queryKey: [...JOBS_KEY, 'overview'],
    queryFn: ({ signal }) => apiRequest('/jobs', { signal }),
    select: (payload) => payload.data,
    refetchInterval: 10_000,
  });
}

/** The failed jobs of one queue. */
export function useFailedJobs(queue, page) {
  return useQuery({
    queryKey: [...JOBS_KEY, 'failed', queue, page],
    queryFn: ({ signal }) => apiRequest(`/jobs/failed?queue=${queue}&page=${page}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(queue),
  });
}

function useJobsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
}

export function useRetryJob() {
  return useJobsMutation(({ queue, jobId }) =>
    apiRequest(`/jobs/${queue}/${encodeURIComponent(jobId)}/retry`, { method: 'POST' }),
  );
}

export function useDeleteJob() {
  return useJobsMutation(({ queue, jobId }) =>
    apiRequest(`/jobs/${queue}/${encodeURIComponent(jobId)}`, { method: 'DELETE' }),
  );
}

export function useSendTestJob() {
  return useJobsMutation((body) => apiRequest('/jobs/test', { method: 'POST', body }));
}

export function useDeleteRole() {
  return useRolesMutation((id) => apiRequest(`/roles/${id}`, { method: 'DELETE' }));
}
