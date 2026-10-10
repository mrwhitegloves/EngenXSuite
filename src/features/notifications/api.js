import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// My own notifications. Cached answers live under 'notifications', which the live
// "notifications.changed" event (sent only to me) makes stale.
const KEY = ['notifications'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** My notifications, newest first. `params`: page, pageSize, unread, search, date range. */
export function useNotifications(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/notifications${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The number on the bell. */
export function useUnreadCount() {
  return useQuery({
    queryKey: [...KEY, 'unread-count'],
    queryFn: ({ signal }) => apiRequest('/notifications/unread-count', { signal }),
    select: (payload) => payload.data.unread,
    // The live event is quicker; this catches up when the live connection was away.
    refetchInterval: 60_000,
  });
}

/** My switches: the master switch and one per kind of notification. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...KEY, 'preferences'],
    queryFn: ({ signal }) => apiRequest('/notifications/preferences', { signal }),
    select: (payload) => payload.data,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const action = (mutationFn) => ({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  return {
    read: useMutation(action((id) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }))),
    readAll: useMutation(action(() => apiRequest('/notifications/read-all', { method: 'POST' }))),
    setPreferences: useMutation(
      action((body) => apiRequest('/notifications/preferences', { method: 'PATCH', body })),
    ),
  };
}
