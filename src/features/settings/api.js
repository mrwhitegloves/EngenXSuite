import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const AUDIT_KEY = ['audit'];

/** Audit entries, newest first. `params`: { page, userId, entityType, action, range, from, to } */
export function useAuditLogs(params) {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ).toString();
  return useQuery({
    queryKey: [...AUDIT_KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/audit-logs${search ? `?${search}` : ''}`, { signal }),
    // Keep showing the current page while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}

/** The users, record types and actions the audit filters offer. */
export function useAuditOptions() {
  return useQuery({
    queryKey: [...AUDIT_KEY, 'options'],
    queryFn: ({ signal }) => apiRequest('/audit-logs/options', { signal }),
    select: (payload) => payload.data,
  });
}

const BACKUPS_KEY = ['backups'];

/** Finished database backups, newest first, and whether storage is set up. */
export function useBackups() {
  return useQuery({
    queryKey: BACKUPS_KEY,
    queryFn: ({ signal }) => apiRequest('/backups', { signal }),
    select: (payload) => payload.data,
    // A backup started by hand finishes in the background: look again every 15 seconds.
    refetchInterval: 15_000,
  });
}

/** Start a backup now. */
export function useStartBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/backups', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BACKUPS_KEY }),
  });
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
