import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// Phone calls. Cached answers live under 'calls', which the live "calls.changed" event makes
// stale. A finished call also shows on the timeline (the "activities.changed" event).
const CALLS_KEY = ['calls'];
const SETTINGS_KEY = [...CALLS_KEY, 'settings'];

/**
 * The calls of one lead, company or contact, newest first.
 * @param {{ opportunityId?: string, accountId?: string, contactId?: string }} target  One of them
 * @param {{ page?: number, pageSize?: number }} [options]
 */
export function useCalls(target, options = {}) {
  const params = { ...target, ...options };
  return useQuery({
    queryKey: [...CALLS_KEY, 'list', params],
    queryFn: ({ signal }) =>
      apiRequest(`/calls?${new URLSearchParams(params).toString()}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** Call a contact: my own phone rings first. Body: { contactId, opportunityId? }. */
export function useStartCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiRequest('/calls', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CALLS_KEY }),
  });
}

/** Say what came of a call. */
export function useSetOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }) =>
      apiRequest(`/calls/${id}`, { method: 'PATCH', body: { outcome } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CALLS_KEY }),
  });
}

/** A link to listen to one recording. Asked for only on a click: opening it is written down. */
export function useRecordingLink() {
  return useMutation({
    mutationFn: (id) => apiRequest(`/calls/${id}/recording`),
  });
}

/** Settings → Calls. */
export function useCallSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => apiRequest('/settings/calls', { signal }),
    select: (payload) => payload.data,
  });
}

export function useSaveCallSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiRequest('/settings/calls', { method: 'PATCH', body }),
    onSuccess: (payload) => queryClient.setQueryData(SETTINGS_KEY, payload),
  });
}
