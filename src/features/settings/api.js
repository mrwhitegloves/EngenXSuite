import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

const ROLES_KEY = ['roles'];

/** Every account type with its permissions, plus the catalogue of what can be granted. */
export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: ({ signal }) => apiRequest('/roles', { signal }),
    select: (payload) => payload.data,
  });
}

function useRolesMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      // The signed-in user's own permissions may have changed: reload them and the menu.
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useUpdateRole() {
  return useRolesMutation(({ id, ...body }) =>
    apiRequest(`/roles/${id}`, { method: 'PATCH', body }),
  );
}

export function useCreateRole() {
  return useRolesMutation((body) => apiRequest('/roles', { method: 'POST', body }));
}

export function useDeleteRole() {
  return useRolesMutation((id) => apiRequest(`/roles/${id}`, { method: 'DELETE' }));
}
