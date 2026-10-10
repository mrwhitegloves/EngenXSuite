import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// CSV import: upload a file, choose its columns, check it, run it, undo it.
// Cached answers live under 'imports', which the live "imports.changed" event makes stale.
const IMPORTS_KEY = ['imports'];
// While the server is working on an import, its page asks again every two seconds
// (the live event is quicker, this is the fallback).
const WORKING = ['queued', 'running', 'undoing'];
export const isWorking = (status) => WORKING.includes(status);

/** Fields a column can fill, limits, saved mappings, and whether file storage is set up. */
export function useImportOptions() {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'options'],
    queryFn: ({ signal }) => apiRequest('/imports/options', { signal }),
    select: (payload) => payload.data,
  });
}

/** Earlier imports, newest first. */
export function useImports(page) {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'list', page],
    queryFn: ({ signal }) => apiRequest(`/imports?page=${page}`, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.data?.some((item) => isWorking(item.status)) ? 3000 : false,
  });
}

/** One import with its headings, mapping, progress and result. */
export function useImport(id) {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'detail', id],
    queryFn: ({ signal }) => apiRequest(`/imports/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
    refetchInterval: (query) => (isWorking(query.state.data?.data?.status) ? 2000 : false),
  });
}

function useImportsMutation(mutationFn, alsoReload = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      [IMPORTS_KEY, ...alsoReload].forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
  });
}

/** Upload a CSV file. Answers the new import. */
export function useUploadImport() {
  return useImportsMutation((file) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest('/imports', { method: 'POST', body });
  });
}

/** Check every row with the chosen columns. Saves nothing. */
export function usePreviewImport(id) {
  return useMutation({
    mutationFn: (body) => apiRequest(`/imports/${id}/preview`, { method: 'POST', body }),
  });
}

export function useStartImport(id) {
  return useImportsMutation((body) => apiRequest(`/imports/${id}/run`, { method: 'POST', body }));
}

export function useUndoImport(id) {
  return useImportsMutation(
    () => apiRequest(`/imports/${id}/undo`, { method: 'POST' }),
    [['accounts'], ['contacts']],
  );
}

export function useDeleteTemplate() {
  return useImportsMutation((id) => apiRequest(`/imports/templates/${id}`, { method: 'DELETE' }));
}
