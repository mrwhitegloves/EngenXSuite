import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient.js';

// The product name is a setting on the server, never text in this code (decision 0001).
// Until it has loaded, `productName` is an empty string so nothing wrong flashes on screen.
export function useBranding() {
  const [branding, setBranding] = useState({ productName: '', companyName: '' });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/public/branding', { signal: controller.signal })
      .then((payload) => setBranding(payload.data))
      .catch(() => {
        // The page still works without the name; the sign-in button does not depend on it.
      });
    return () => controller.abort();
  }, []);

  // Keep the browser tab title in step with the setting.
  useEffect(() => {
    if (branding.productName) document.title = branding.productName;
  }, [branding.productName]);

  return branding;
}
