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
    onSuccess: () => {
      // Mark "nobody signed in" on the query the screen is watching, so the sign-in page shows
      // at once. (Clearing the whole cache instead would detach that query from the screen.)
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      // Then drop every other cached answer: the next person on this browser must not see
      // this user's data.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
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
