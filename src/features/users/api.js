import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

const USERS_KEY = ['users'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** The users the signed-in person may see. `params`: { page, search, status } */
export function useUsers(params) {
  return useQuery({
    queryKey: [...USERS_KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/users${toQueryString(params)}`, { signal }),
    // Keep showing the current page while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}

/** Account types and managers the signed-in person may choose in the form. */
export function useUserFormOptions(enabled) {
  return useQuery({
    queryKey: [...USERS_KEY, 'form-options'],
    queryFn: ({ signal }) => apiRequest('/users/form-options', { signal }),
    select: (payload) => payload.data,
    enabled,
  });
}

function useUsersMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useCreateUser() {
  return useUsersMutation((body) => apiRequest('/users', { method: 'POST', body }));
}

export function useUpdateUser() {
  return useUsersMutation(({ id, ...body }) =>
    apiRequest(`/users/${id}`, { method: 'PATCH', body }),
  );
}

export function useResetPassword() {
  return useUsersMutation(({ id, password }) =>
    apiRequest(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
  );
}
