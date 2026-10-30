import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// The Links screen: web addresses with a description, credentials and a thumbnail.
const KEY = ['links'];

/** @param {{ search?: string, page?: number }} params */
export function useLinks({ search, page = 1 } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: '24' });
  if (search) query.set('search', search);
  return useQuery({
    queryKey: [...KEY, search ?? '', page],
    queryFn: ({ signal }) => apiRequest(`/links?${query}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useLinkActions() {
  const queryClient = useQueryClient();
  const action = (mutationFn) => ({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  return {
    create: useMutation(action((body) => apiRequest('/links', { method: 'POST', body }))),
    update: useMutation(
      action(({ id, ...body }) => apiRequest(`/links/${id}`, { method: 'PATCH', body })),
    ),
    remove: useMutation(action((id) => apiRequest(`/links/${id}`, { method: 'DELETE' }))),
    // { id, file }
    uploadThumbnail: useMutation(
      action(({ id, file }) => {
        const body = new FormData();
        body.append('file', file);
        return apiRequest(`/links/${id}/thumbnail`, { method: 'POST', body });
      }),
    ),
    removeThumbnail: useMutation(
      action((id) => apiRequest(`/links/${id}/thumbnail`, { method: 'DELETE' })),
    ),
  };
}
