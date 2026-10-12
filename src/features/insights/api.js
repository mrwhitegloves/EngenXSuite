import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// AI insights about one record, and the AI settings. An insight is kept on the server: reading
// it costs nothing; "refresh" asks the AI again (a few seconds, and a little money).
const KEY = ['insights'];
const SETTINGS_KEY = [...KEY, 'settings'];

/**
 * The saved insight of one record, and what can be done with it.
 *   refresh  : ask the AI for a new one
 *   feedback : say what I think of it ({ verdict, note })
 *   accept   : make a task of the suggested next step (a lead's assessment only)
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
  // Every action answers with the insight as it is now.
  const keepAnswer = (payload) => queryClient.setQueryData(key, payload);
  const insightId = saved.data?.insight?.id;

  const refresh = useMutation({
    mutationFn: () => apiRequest(`/insights/${kind}/${id}/refresh`, { method: 'POST' }),
    onSuccess: (payload) => {
      keepAnswer(payload);
      // A lead's score is also shown on the board and in lists.
      if (kind === 'leads') queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
  const feedback = useMutation({
    mutationFn: (body) => apiRequest(`/insights/${insightId}/feedback`, { method: 'POST', body }),
    onSuccess: keepAnswer,
  });
  const accept = useMutation({
    mutationFn: () => apiRequest(`/insights/${insightId}/accept-action`, { method: 'POST' }),
    onSuccess: (payload) => {
      keepAnswer(payload);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
  return { saved, refresh, feedback, accept };
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
