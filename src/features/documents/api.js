import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// The documents of a company: files kept in the CRM for it.
const KEY = ['documents'];

export function useAccountDocuments(accountId, enabled = true) {
  return useQuery({
    queryKey: [...KEY, accountId],
    queryFn: ({ signal }) => apiRequest(`/documents?accountId=${accountId}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(accountId) && enabled,
  });
}

export function useDocumentActions(accountId) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: KEY });
  return {
    upload: useMutation({
      mutationFn: (file) => {
        const body = new FormData();
        // The fields first: the server reads them next to the file.
        body.append('accountId', accountId);
        body.append('file', file);
        return apiRequest('/documents', { method: 'POST', body });
      },
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id) => apiRequest(`/documents/${id}`, { method: 'DELETE' }),
      onSuccess,
    }),
  };
}
