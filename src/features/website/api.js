import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// The Website screen: analytics of engenx.in, read by the server from the website's own
// database. Cached answers live under 'website'.
const KEY = ['website'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Is the website's database connected. */
export function useWebsiteStatus() {
  return useQuery({
    queryKey: [...KEY, 'status'],
    queryFn: ({ signal }) => apiRequest('/website/status', { signal }),
    select: (payload) => payload.data,
    staleTime: 5 * 60_000,
  });
}

/** Totals, the traffic chart, pages, devices and sources for the chosen dates. */
export function useWebsiteOverview(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'overview', params],
    queryFn: ({ signal }) =>
      apiRequest(`/website/analytics/overview${toQueryString(params)}`, { signal }),
    select: (payload) => payload.data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** One row per visitor. `params`: dates, search, page. */
export function useWebsiteSessions(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'sessions', params],
    queryFn: ({ signal }) =>
      apiRequest(`/website/analytics/sessions${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The website's contact-form leads. `params`: dates, search, page. */
export function useWebsiteLeads(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'leads', params],
    queryFn: ({ signal }) =>
      apiRequest(`/website/analytics/leads${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}
