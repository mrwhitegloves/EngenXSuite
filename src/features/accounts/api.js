import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

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

/** A company and its people from the one "New" form in the top bar. */
export function useQuickAdd() {
  return useAccountsMutation((body) => apiRequest('/accounts/quick-add', { method: 'POST', body }));
}

/** True when the server refused because a company with a similar name exists already. */
export function isDuplicateName(error) {
  return Boolean(error?.details?.some?.((detail) => detail.code === 'DUPLICATE_NAME'));
}
