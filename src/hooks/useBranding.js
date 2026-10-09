import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient.js';

export const BRANDING_KEY = ['branding'];
const NOT_LOADED = { productName: '', companyName: '' };

// The product name is a setting on the server, never text in this code (decision 0001).
// Until it has loaded, `productName` is an empty string so nothing wrong flashes on screen.
// When someone changes it in Settings, every open browser is told and reloads it.
export function useBranding() {
  const query = useQuery({
    queryKey: BRANDING_KEY,
    queryFn: ({ signal }) => apiRequest('/public/branding', { signal }),
    select: (payload) => payload.data,
    // Almost never changes; a change arrives as a live event anyway.
    staleTime: 5 * 60 * 1000,
  });
  // On an error the page still works without the name; the sign-in button does not depend on it.
  const branding = query.data ?? NOT_LOADED;

  // Keep the browser tab title in step with the setting.
  useEffect(() => {
    if (branding.productName) document.title = branding.productName;
  }, [branding.productName]);

  return branding;
}
