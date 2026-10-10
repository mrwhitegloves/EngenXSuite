import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDownload, apiRequest } from '../../lib/apiClient.js';

// Accounts = customer companies. (People who sign in are "users".)
const ACCOUNTS_KEY = ['accounts'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** The accounts the signed-in person may see. `params`: page, sort, search, filters, date range. */
export function useAccounts(params) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/accounts${toQueryString(params)}`, { signal }),
    // Keep showing the current page while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}

/** What the forms and filters offer: statuses, people, sizes, industries and regions in use. */
export function useAccountOptions() {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'form-options'],
    queryFn: ({ signal }) => apiRequest('/accounts/form-options', { signal }),
    select: (payload) => payload.data,
  });
}

/** One account in full (for the edit form). */
export function useAccount(id) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'detail', id],
    queryFn: ({ signal }) => apiRequest(`/accounts/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
  });
}

function useAccountsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}

export function useCreateAccount() {
  return useAccountsMutation((body) => apiRequest('/accounts', { method: 'POST', body }));
}

export function useUpdateAccount() {
  return useAccountsMutation(({ id, ...body }) =>
    apiRequest(`/accounts/${id}`, { method: 'PATCH', body }),
  );
}

export function useDeleteAccount() {
  return useAccountsMutation((id) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }));
}

/**
 * Download the accounts the current filters show, as a CSV file.
 * `params`: the list's filters and sort (no page: the file holds every matching account).
 */
export function useExportAccounts() {
  return useMutation({
    mutationFn: (params) => apiDownload(`/accounts/export${toQueryString(params)}`, 'accounts.csv'),
  });
}

/** A company and its people from the one "New" form in the top bar. */
export function useQuickAdd() {
  return useAccountsMutation((body) => apiRequest('/accounts/quick-add', { method: 'POST', body }));
}

// ── The records under an account: people, plants, machines ─────────────────────────────────
// Their cached answers are kept under their own first key ('contacts', 'plants'), which is what
// the live "contacts.changed" / "plants.changed" events make stale.

function useListOf(queryKey, path, enabled = true) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => apiRequest(path, { signal }),
    select: (payload) => payload.data,
    enabled,
  });
}

/** create / update / remove for one kind of record; each reloads the given keys afterwards. */
function useRecordActions({ createPath, itemPath, reloadKeys }) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    reloadKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  return {
    create: useMutation({
      mutationFn: (body) => apiRequest(createPath, { method: 'POST', body }),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }) => apiRequest(`${itemPath}/${id}`, { method: 'PATCH', body }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id) => apiRequest(`${itemPath}/${id}`, { method: 'DELETE' }),
      onSuccess,
    }),
  };
}

/** The people of one account. */
export function useAccountContacts(accountId) {
  return useListOf(['contacts', accountId], `/accounts/${accountId}/contacts`);
}

export function useContactActions(accountId) {
  return useRecordActions({
    createPath: `/accounts/${accountId}/contacts`,
    itemPath: '/contacts',
    // Plants show their people by name: reload them too.
    reloadKeys: [['contacts'], ['plants']],
  });
}

/** The plants of one account. */
export function useAccountPlants(accountId) {
  return useListOf(['plants', accountId], `/accounts/${accountId}/plants`);
}

export function usePlantActions(accountId) {
  return useRecordActions({
    createPath: `/accounts/${accountId}/plants`,
    itemPath: '/plants',
    reloadKeys: [['plants']],
  });
}

/** The machines of one plant; asked for only while that plant is opened. */
export function usePlantMachines(plantId, enabled) {
  return useListOf(['plants', 'machines', plantId], `/plants/${plantId}/machines`, enabled);
}

export function useMachineActions(plantId) {
  return useRecordActions({
    createPath: `/plants/${plantId}/machines`,
    itemPath: '/machines',
    reloadKeys: [['plants']],
  });
}

/** The departments and production lines of one plant; asked for only while it is opened. */
export function usePlantUnits(plantId) {
  return useListOf(['plants', 'units', plantId], `/plants/${plantId}/units`);
}

export function useUnitActions(plantId) {
  return useRecordActions({
    createPath: `/plants/${plantId}/units`,
    itemPath: '/plant-units',
    reloadKeys: [['plants']],
  });
}

/** True when the server refused because a company with a similar name exists already. */
export function isDuplicateName(error) {
  return Boolean(error?.details?.some?.((detail) => detail.code === 'DUPLICATE_NAME'));
}
