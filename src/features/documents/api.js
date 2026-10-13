import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// The documents library: one for the whole CRM, in folders the team makes itself.
const KEY = ['documents'];

/**
 * What one folder holds (the top when no folder is given), or a search through everything.
 * @param {{ folderId?: string, search?: string }} params
 */
export function useDocuments({ folderId, search } = {}, enabled = true) {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  else if (folderId) query.set('folderId', folderId);
  return useQuery({
    queryKey: [...KEY, 'browse', folderId ?? '', search ?? ''],
    queryFn: ({ signal }) => apiRequest(`/documents?${query}`, { signal }),
    select: (payload) => payload.data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Every folder with its full path, for "move to…". */
export function useAllFolders(enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'folders'],
    queryFn: ({ signal }) => apiRequest('/documents/folders', { signal }),
    select: (payload) => payload.data,
    enabled,
  });
}

export function useDocumentActions() {
  const queryClient = useQueryClient();
  const action = (mutationFn) => ({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  return {
    // { file, folderId }
    upload: useMutation(
      action(({ file, folderId }) => {
        const body = new FormData();
        // The fields first: the server reads them next to the file.
        if (folderId) body.append('folderId', folderId);
        body.append('file', file);
        return apiRequest('/documents', { method: 'POST', body });
      }),
    ),
    // { id, name?, folderId? }: rename, or move (folderId null: to the top).
    update: useMutation(
      action(({ id, ...body }) => apiRequest(`/documents/${id}`, { method: 'PATCH', body })),
    ),
    remove: useMutation(action((id) => apiRequest(`/documents/${id}`, { method: 'DELETE' }))),
    createFolder: useMutation(
      action((body) => apiRequest('/documents/folders', { method: 'POST', body })),
    ),
    renameFolder: useMutation(
      action(({ id, name }) =>
        apiRequest(`/documents/folders/${id}`, { method: 'PATCH', body: { name } }),
      ),
    ),
    removeFolder: useMutation(
      action((id) => apiRequest(`/documents/folders/${id}`, { method: 'DELETE' })),
    ),
  };
}
