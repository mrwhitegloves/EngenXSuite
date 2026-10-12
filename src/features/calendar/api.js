import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// Meetings. Cached answers live under 'meetings', which the live "meetings.changed" event
// makes stale. A meeting also shows on the timeline of its lead and company.
const KEY = ['meetings'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  return search.toString();
}

/**
 * Meetings of a span of days (`from`, `to`, `mine`), or of one lead or company
 * (`opportunityId` / `accountId`).
 */
export function useMeetings(params) {
  return useQuery({
    queryKey: [...KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/meetings?${toQueryString(params)}`, { signal }),
    select: (payload) => payload.data,
  });
}

export function useMeeting(id) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: ({ signal }) => apiRequest(`/meetings/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
  });
}

/** The kinds of meeting, the colleagues to invite, and whether my Google Calendar is connected. */
export function useMeetingOptions() {
  return useQuery({
    queryKey: [...KEY, 'form-options'],
    queryFn: ({ signal }) => apiRequest('/meetings/form-options', { signal }),
    select: (payload) => payload.data,
  });
}

/** The company of a lead: its people are the ones a meeting about the lead can invite. */
export function useLeadAccountId(leadId) {
  return useQuery({
    queryKey: ['opportunities', 'detail', leadId, 'account-id'],
    queryFn: ({ signal }) => apiRequest(`/opportunities/${leadId}`, { signal }),
    select: (payload) => payload.data.account?.id ?? null,
    enabled: Boolean(leadId),
  });
}

export function useMeetingActions() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };
  return {
    create: useMutation({
      mutationFn: (body) => apiRequest('/meetings', { method: 'POST', body }),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }) => apiRequest(`/meetings/${id}`, { method: 'PATCH', body }),
      onSuccess,
    }),
    // It was held, the customer did not come, or it is cancelled.
    close: useMutation({
      mutationFn: ({ id, ...body }) =>
        apiRequest(`/meetings/${id}/close`, { method: 'POST', body }),
      onSuccess,
    }),
    // Read my Google Calendar now.
    sync: useMutation({
      mutationFn: () => apiRequest('/meetings/sync', { method: 'POST' }),
      onSuccess,
    }),
  };
}
