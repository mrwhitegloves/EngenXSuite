import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient.js';

const key = (screen) => ['saved-views', screen];

/** My saved views for one screen: [{ id, name, query }]. */
export function useSavedViews(screen) {
  return useQuery({
    queryKey: key(screen),
    queryFn: ({ signal }) => apiRequest(`/saved-views?screen=${screen}`, { signal }),
    select: (payload) => payload.data,
  });
}

/** Save the given filters under a name (the same name is replaced). */
export function useSaveView(screen) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, query }) =>
      apiRequest('/saved-views', { method: 'POST', body: { screen, name, query } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(screen) }),
  });
}

export function useDeleteView(screen) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiRequest(`/saved-views/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(screen) }),
  });
}
