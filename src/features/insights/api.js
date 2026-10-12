import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// AI insights about one record, and the AI settings. An insight is kept on the server: reading
// it costs nothing; "refresh" asks the AI again (a few seconds, and a little money).
const KEY = ['insights'];
const SETTINGS_KEY = [...KEY, 'settings'];

/**
 * The saved insight of one record, and the action that asks the AI for a new one.
 * @param {'accounts' | 'leads'} kind
 * @param {string} id
 */
export function useInsight(kind, id) {
  const queryClient = useQueryClient();
  const key = [...KEY, kind, id];
  const saved = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => apiRequest(`/insights/${kind}/${id}`, { signal }),
    select: (payload) => payload.data,
  });
  const refresh = useMutation({
    mutationFn: () => apiRequest(`/insights/${kind}/${id}/refresh`, { method: 'POST' }),
    onSuccess: (payload) => {
      queryClient.setQueryData(key, payload);
      // A lead's score is also shown in lists.
      if (kind === 'leads') queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
  return { saved, refresh };
}

/** Settings → AI. */
export function useAiSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => apiRequest('/settings/ai', { signal }),
    select: (payload) => payload.data,
  });
}

export function useSaveAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiRequest('/settings/ai', { method: 'PATCH', body }),
    onSuccess: (payload) => queryClient.setQueryData(SETTINGS_KEY, payload),
  });
}
