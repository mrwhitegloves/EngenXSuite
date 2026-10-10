import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDownload, apiRequest } from '../../lib/apiClient.js';

// Leads. The server decides which leads a person sees (decision 0008); these hooks only ask.
// Cached answers live under 'opportunities', which the live "opportunities.changed" event
// makes stale, so every open screen shows a change made by anyone.
const LEADS_KEY = ['opportunities'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** The leads the signed-in person may see. `params`: page, sort, search, filters, date range. */
export function useLeads(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...LEADS_KEY, 'list', params],
    queryFn: ({ signal }) => apiRequest(`/opportunities${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The leads grouped by stage, for the board. `params`: the same filters as the list. */
export function useBoard(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...LEADS_KEY, 'board', params],
    queryFn: ({ signal }) => apiRequest(`/opportunities/board${toQueryString(params)}`, { signal }),
    select: (payload) => payload.data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The stages one lead has been through, newest first. */
export function useStageHistory(id) {
  return useQuery({
    queryKey: [...LEADS_KEY, 'stage-history', id],
    queryFn: ({ signal }) => apiRequest(`/opportunities/${id}/stage-history`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
  });
}

/** Stages, lead statuses, solution categories, and the people a lead can be given to. */
export function useLeadOptions() {
  return useQuery({
    queryKey: [...LEADS_KEY, 'form-options'],
    queryFn: ({ signal }) => apiRequest('/opportunities/form-options', { signal }),
    select: (payload) => payload.data,
  });
}

/** One lead in full. */
export function useLead(id) {
  return useQuery({
    queryKey: [...LEADS_KEY, 'detail', id],
    queryFn: ({ signal }) => apiRequest(`/opportunities/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
  });
}

function useLeadsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // The lead form can also change the lead's contact and company: reload those as well.
    onSuccess: () =>
      [LEADS_KEY, ['accounts'], ['contacts']].forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
  });
}

export function useCreateLead() {
  return useLeadsMutation((body) => apiRequest('/opportunities', { method: 'POST', body }));
}

export function useUpdateLead() {
  return useLeadsMutation(({ id, ...body }) =>
    apiRequest(`/opportunities/${id}`, { method: 'PATCH', body }),
  );
}

/** Move a lead to another stage: { id, stageId, closeReason?, lostToCompetitor?, via? }. */
export function useChangeStage() {
  return useLeadsMutation(({ id, ...body }) =>
    apiRequest(`/opportunities/${id}/stage`, { method: 'POST', body }),
  );
}

export function useDeleteLead() {
  return useLeadsMutation((id) => apiRequest(`/opportunities/${id}`, { method: 'DELETE' }));
}

/**
 * Download the leads the current filters show, as a CSV file.
 * `params`: the filters and the sort (no page: the file holds every matching lead).
 */
export function useExportLeads() {
  return useMutation({
    mutationFn: (params) =>
      apiDownload(`/opportunities/export${toQueryString(params)}`, 'leads.csv'),
  });
}

/** True when the server refused a save because someone else saved the lead in between. */
export function isStaleData(error) {
  return Boolean(error?.details?.some?.((detail) => detail.code === 'STALE_DATA'));
}
