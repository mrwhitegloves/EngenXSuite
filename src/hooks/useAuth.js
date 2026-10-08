import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient.js';

/**
 * Who is signed in.
 * status: 'loading' | 'signedOut' | 'signedIn' | 'error'
 * user:   { id, email, name, avatarUrl, role: { name }, grants: [{ feature, action, scope }] }
 */
export function useAuth() {
  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/auth/me', { signal: controller.signal })
      .then((payload) => setState({ status: 'signedIn', user: payload.data, error: null }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        // 401 simply means "nobody is signed in"; anything else is a real problem.
        if (error.status === 401) setState({ status: 'signedOut', user: null, error: null });
        else setState({ status: 'error', user: null, error: error.message });
      });
    return () => controller.abort();
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setState({ status: 'signedOut', user: null, error: null });
  }, []);

  return { ...state, signOut };
}
