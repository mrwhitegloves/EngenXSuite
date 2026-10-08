import { useCallback } from 'react';
import { useAuth } from './useAuth.js';

/**
 * Returns can(feature, action): does the signed-in user hold this permission at all?
 * Used ONLY to hide menu items and buttons the user cannot use. It is not security:
 * the server checks every request again, including which records the user may touch.
 */
export function useCan() {
  const { user } = useAuth();
  const grants = user?.grants;

  return useCallback(
    (feature, action = 'view') =>
      Boolean(grants?.some((grant) => grant.feature === feature && grant.action === action)),
    [grants],
  );
}
