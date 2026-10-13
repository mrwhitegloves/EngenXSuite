import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// Phone calls. Cached answers live under 'calls', which the live "calls.changed" event makes
// stale. A finished call also shows on the timeline (the "activities.changed" event).
const CALLS_KEY = ['calls'];
const SETTINGS_KEY = [...CALLS_KEY, 'settings'];

/**
 * The calls of one lead, company or contact, newest first. With an empty target: every call I
 * may see (mine, my team's or everyone's), and `linked: 'no'` for calls that belong to nobody.
 * The call log passes its filters here too (search, direction, status, sort, dates…).
 * @param {{ opportunityId?: string, accountId?: string, contactId?: string, linked?: string }} target
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

/** One call in full: its times, both of its sides, and what happened step by step. */
export function useCallDetail(id) {
  return useQuery({
    queryKey: [...CALLS_KEY, 'detail', id],
    queryFn: ({ signal }) => apiRequest(`/calls/${id}`, { signal }),
    select: (payload) => payload.data,
  });
}

/** The people whose calls I may see: for the "who called" filter of the call log. */
export function useCallOptions() {
  return useQuery({
    queryKey: [...CALLS_KEY, 'form-options'],
    queryFn: ({ signal }) => apiRequest('/calls/form-options', { signal }),
    select: (payload) => payload.data,
    staleTime: 5 * 60_000,
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

/** Put a call on a person (their company and open lead follow); contactId null takes it off. */
export function useLinkCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contactId }) =>
      apiRequest(`/calls/${id}`, { method: 'PATCH', body: { contactId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALLS_KEY });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

/** People that match the text, for choosing who a call was with (the server applies my access). */
export function usePeopleSearch(text) {
  return useQuery({
    queryKey: ['search', text],
    queryFn: ({ signal }) => apiRequest(`/search?q=${encodeURIComponent(text)}`, { signal }),
    select: (payload) => payload.data.contacts ?? [],
    enabled: text.length >= 2,
    staleTime: 15_000,
  });
}

/** A link to listen to one recording. Asked for only on a click: opening it is written down. */
export function useRecordingLink() {
  return useMutation({
    mutationFn: (id) => apiRequest(`/calls/${id}/recording`),
  });
}

/** The saved text of a call (made from its recording). Asked for when its block is opened. */
export function useCallTranscript(id) {
  return useQuery({
    queryKey: [...CALLS_KEY, 'transcript', id],
    queryFn: ({ signal }) => apiRequest(`/calls/${id}/transcript`, { signal }),
    select: (payload) => payload.data,
  });
}

/** Make the text of a call from its recording (again). Takes up to a minute. */
export function useMakeTranscript(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`/calls/${id}/transcript`, { method: 'POST' }),
    onSuccess: (payload) => {
      queryClient.setQueryData([...CALLS_KEY, 'transcript', id], payload);
      queryClient.invalidateQueries({ queryKey: [...CALLS_KEY, 'list'] });
    },
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
