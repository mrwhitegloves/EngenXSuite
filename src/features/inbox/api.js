import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// Customer mail. Cached answers live under 'emails', which the live "emails.changed" event
// makes stale. A mail also shows on the timeline of its lead and company.
const KEY = ['emails'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  return search.toString();
}

/** Is my mailbox connected, and when was it last read. */
export function useMailbox() {
  return useQuery({
    queryKey: [...KEY, 'mailbox'],
    queryFn: ({ signal }) => apiRequest('/emails/mailbox', { signal }),
    select: (payload) => payload.data,
  });
}

/** Conversations, newest first. `params`: view, search, page, accountId, opportunityId, contactId. */
export function useThreads(params) {
  return useQuery({
    queryKey: [...KEY, 'threads', params],
    queryFn: ({ signal }) => apiRequest(`/emails/threads?${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** One conversation with its messages. */
export function useThread(id) {
  return useQuery({
    queryKey: [...KEY, 'thread', id],
    queryFn: ({ signal }) => apiRequest(`/emails/threads/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
  });
}

/** The files that came or went with the mail of one company, newest first. */
export function useAccountFiles(accountId, enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'files', accountId],
    queryFn: ({ signal }) => apiRequest(`/emails/files?accountId=${accountId}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(accountId) && enabled,
  });
}

/** Read my mailbox now, send a mail, and the AI's help on one conversation. */
export function useMailActions(threadId) {
  const queryClient = useQueryClient();
  const reload = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };
  return {
    sync: useMutation({
      mutationFn: () => apiRequest('/emails/sync', { method: 'POST' }),
      // The reading runs in the background: look again shortly, and once more a little later.
      onSuccess: () => [3000, 9000].forEach((wait) => setTimeout(reload, wait)),
    }),
    send: useMutation({
      mutationFn: (body) => apiRequest('/emails/send', { method: 'POST', body }),
      onSuccess: reload,
    }),
    // Keep a file from my device, to send with my next mail.
    upload: useMutation({
      mutationFn: (file) => {
        const body = new FormData();
        body.append('file', file);
        return apiRequest('/emails/attachments', { method: 'POST', body });
      },
    }),
    // The AI writes a mail or changes the one on the screen. It sends nothing.
    write: useMutation({
      mutationFn: (body) => apiRequest('/emails/write', { method: 'POST', body }),
    }),
    classify: useMutation({
      mutationFn: () => apiRequest(`/emails/threads/${threadId}/classify`, { method: 'POST' }),
      onSuccess: (payload) => {
        queryClient.setQueryData([...KEY, 'thread', threadId], payload);
        queryClient.invalidateQueries({ queryKey: [...KEY, 'threads'] });
      },
    }),
    draft: useMutation({
      mutationFn: (body) =>
        apiRequest(`/emails/threads/${threadId}/draft`, { method: 'POST', body: body ?? {} }),
    }),
  };
}
