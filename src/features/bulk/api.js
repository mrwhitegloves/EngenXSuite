import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDownload, apiRequest } from '../../lib/apiClient.js';

// Bulk sending: bundles (lists of people and companies) and sendings (a mail or a WhatsApp
// template to everyone in a bundle). Cached under 'bundles' and 'campaigns'; the live
// "campaigns.changed" event makes both stale.
const BUNDLES = ['bundles'];
const SENDINGS = ['campaigns'];

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  return search.toString();
};

export function useBundles(params = {}, enabled = true) {
  return useQuery({
    queryKey: [...BUNDLES, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/bundles?${query(params)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** One bundle and a page of who is in it. */
export function useBundle(id, page = 1) {
  return useQuery({
    queryKey: [...BUNDLES, 'detail', id, page],
    queryFn: ({ signal }) => apiRequest(`/bundles/${id}?page=${page}&pageSize=50`, { signal }),
    placeholderData: keepPreviousData,
    enabled: Boolean(id),
  });
}

/** People and companies that can still be added to a bundle. */
export function useBundleCandidates(id, search) {
  return useQuery({
    queryKey: [...BUNDLES, 'candidates', id, search],
    queryFn: ({ signal }) =>
      apiRequest(`/bundles/${id}/candidates?search=${encodeURIComponent(search)}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id) && search.length >= 2,
  });
}

export function useBundleActions() {
  const queryClient = useQueryClient();
  const action = (mutationFn) => ({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BUNDLES }),
  });
  return {
    create: useMutation(action((body) => apiRequest('/bundles', { method: 'POST', body }))),
    rename: useMutation(
      action(({ id, name }) => apiRequest(`/bundles/${id}`, { method: 'PATCH', body: { name } })),
    ),
    remove: useMutation(action((id) => apiRequest(`/bundles/${id}`, { method: 'DELETE' }))),
    addMembers: useMutation(
      action(({ id, ...body }) => apiRequest(`/bundles/${id}/members`, { method: 'POST', body })),
    ),
    removeMember: useMutation(
      action(({ id, memberId }) =>
        apiRequest(`/bundles/${id}/members/${memberId}`, { method: 'DELETE' }),
      ),
    ),
  };
}

export function useSendings(page = 1) {
  return useQuery({
    queryKey: [...SENDINGS, 'list', page],
    queryFn: ({ signal }) => apiRequest(`/campaigns?page=${page}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useSending(id) {
  return useQuery({
    queryKey: [...SENDINGS, 'detail', id],
    queryFn: ({ signal }) => apiRequest(`/campaigns/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
    // While it runs, look again every few seconds (also when no live event arrives).
    refetchInterval: (state) => (state.state.data?.data?.status === 'running' ? 5000 : false),
  });
}

/** Who got what, when, and why not. */
export function useRecipients(id, params, isRunning) {
  return useQuery({
    queryKey: [...SENDINGS, 'recipients', id, params],
    queryFn: ({ signal }) =>
      apiRequest(`/campaigns/${id}/recipients?${query({ ...params, pageSize: 50 })}`, { signal }),
    placeholderData: keepPreviousData,
    enabled: Boolean(id),
    refetchInterval: isRunning ? 5000 : false,
  });
}

export function useSendingActions() {
  const queryClient = useQueryClient();
  const reload = () => {
    queryClient.invalidateQueries({ queryKey: SENDINGS });
    queryClient.invalidateQueries({ queryKey: BUNDLES });
  };
  const post = (path, body) => apiRequest(`/campaigns${path}`, { method: 'POST', body });
  return {
    create: useMutation({ mutationFn: (body) => post('', body), onSuccess: reload }),
    // What it would do, and one mail as the AI would write it. Sends nothing.
    preview: useMutation({ mutationFn: (id) => post(`/${id}/preview`) }),
    start: useMutation({ mutationFn: (id) => post(`/${id}/start`), onSuccess: reload }),
    stop: useMutation({
      mutationFn: ({ id, action }) => post(`/${id}/stop`, { action }),
      onSuccess: reload,
    }),
    // The people who did not get it, as a new bundle.
    keepUnsent: useMutation({
      mutationFn: ({ id, name }) => post(`/${id}/bundle`, { name }),
      onSuccess: reload,
    }),
  };
}

// ── Many companies at once, from the Accounts screen
export function useAccountsBulk() {
  const queryClient = useQueryClient();
  return {
    // The ids of every company the filters match (for "select all").
    allIds: useMutation({
      mutationFn: (filters) => apiRequest(`/accounts/ids?${query(filters)}`),
    }),
    assign: useMutation({
      mutationFn: (body) => apiRequest('/accounts/bulk/assign', { method: 'POST', body }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    }),
    exportSelected: useMutation({
      mutationFn: (accountIds) =>
        apiDownload('/accounts/bulk/export', 'selected-accounts.csv', {
          method: 'POST',
          body: { accountIds },
        }),
    }),
  };
}
