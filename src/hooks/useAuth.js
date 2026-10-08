import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient.js';

export const CURRENT_USER_KEY = ['auth', 'me'];

async function fetchCurrentUser({ signal }) {
  try {
    const payload = await apiRequest('/auth/me', { signal });
    return payload.data;
  } catch (error) {
    // 401 simply means "nobody is signed in": that is a normal answer, not a failure.
    if (error.status === 401) return null;
    throw error;
  }
}

/**
 * Who is signed in.
 * status: 'loading' | 'signedOut' | 'signedIn' | 'error'
 * user:   { id, email, name, avatarUrl, theme, role: { name }, grants: [{ feature, action, scope }] }
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: CURRENT_USER_KEY, queryFn: fetchCurrentUser });

  const signOutMutation = useMutation({
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST' }),
    // Drop every cached answer: the next person on this browser must not see this user's data.
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, null);
    },
  });

  let status = 'signedIn';
  if (query.isPending) status = 'loading';
  else if (query.isError) status = 'error';
  else if (!query.data) status = 'signedOut';

  return {
    status,
    user: query.data ?? null,
    error: query.error?.message ?? null,
    retry: query.refetch,
    signOut: signOutMutation.mutate,
  };
}
