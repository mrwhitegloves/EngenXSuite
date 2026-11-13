import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// The Document generator's API: /api/generator/<kind path> (proposals, letterheads, invoices).
const KEY = ['generator'];

/** One page of saved documents of a kind. */
export function useGeneratedList(kindPath, { search, page = 1 } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (search) query.set('search', search);
  return useQuery({
    queryKey: [...KEY, kindPath, 'list', search ?? '', page],
    queryFn: ({ signal }) => apiRequest(`/generator/${kindPath}?${query}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** One saved document with its values. */
export function useGenerated(kindPath, id) {
  return useQuery({
    queryKey: [...KEY, kindPath, 'one', id],
    queryFn: ({ signal }) => apiRequest(`/generator/${kindPath}/${id}`, { signal }),
    enabled: Boolean(id),
    staleTime: Infinity, // the open copy is the person's work; never refetched under them
  });
}

/**
 * The reference number a new document of the kind gets suggested. `refNo` is null when it could
 * not be had (the person then types one).
 */
export function useNextRef(kindPath, enabled) {
  const { data, isLoading } = useQuery({
    queryKey: [...KEY, kindPath, 'next-ref'],
    queryFn: ({ signal }) => apiRequest(`/generator/${kindPath}/next-ref`, { signal }),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return { refNo: data?.data?.refNo || null, isLoading };
}

export function useGeneratedActions(kindPath) {
  const queryClient = useQueryClient();
  const refreshList = () => queryClient.invalidateQueries({ queryKey: [...KEY, kindPath, 'list'] });
  return {
    create: useMutation({
      mutationFn: (body) => apiRequest(`/generator/${kindPath}`, { method: 'POST', body }),
      onSuccess: refreshList,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }) =>
        apiRequest(`/generator/${kindPath}/${id}`, { method: 'PATCH', body }),
      onSuccess: refreshList,
    }),
    remove: useMutation({
      mutationFn: (id) => apiRequest(`/generator/${kindPath}/${id}`, { method: 'DELETE' }),
      onSuccess: refreshList,
    }),
  };
}

/**
 * The company seal with the signature, as a data address, so it shows in the preview and goes
 * into the PDF. Fetched once per visit; null until it arrives or when it cannot be loaded.
 */
export function useSeal() {
  const { data } = useQuery({
    queryKey: [...KEY, 'seal'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/generator/assets/seal', {
        credentials: 'same-origin',
        signal,
      });
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    },
    staleTime: Infinity,
    retry: false,
  });
  return data ?? null;
}
