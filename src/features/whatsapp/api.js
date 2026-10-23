import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient.js';

// WhatsApp with customers. Cached answers live under 'whatsapp', which the live
// "whatsapp.changed" event makes stale. A message also shows on the timeline of its person,
// company and lead.
export const WHATSAPP_KEY = ['whatsapp'];

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  return search.toString();
}

/** Is WhatsApp set up, and what is missing (names only). */
export function useWhatsAppSetup() {
  return useQuery({
    queryKey: [...WHATSAPP_KEY, 'setup'],
    queryFn: ({ signal }) => apiRequest('/whatsapp/setup', { signal }),
    select: (payload) => payload.data,
    staleTime: 5 * 60_000,
  });
}

/** Settings → WhatsApp: the setup and the business number as Meta shows it. */
export function useWhatsAppStatus() {
  return useQuery({
    queryKey: [...WHATSAPP_KEY, 'status'],
    queryFn: ({ signal }) => apiRequest('/whatsapp/status', { signal }),
    select: (payload) => payload.data,
  });
}

/** Approved templates the CRM can send; `all`: every template with the reason it cannot. */
export function useTemplates({ all = false, enabled = true } = {}) {
  return useQuery({
    queryKey: [...WHATSAPP_KEY, 'templates', all],
    queryFn: ({ signal }) => apiRequest(`/whatsapp/templates${all ? '?all=1' : ''}`, { signal }),
    select: (payload) => payload.data,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Ask Meta for the templates again (after one was approved). */
export function useRefreshTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/whatsapp/templates?all=1&refresh=1'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...WHATSAPP_KEY, 'templates'] }),
  });
}

/** A page of conversations, with the count of each tab in `meta.counts`. */
export function useConversations(params) {
  return useQuery({
    queryKey: [...WHATSAPP_KEY, 'list', params],
    queryFn: ({ signal }) =>
      apiRequest(`/whatsapp/conversations?${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** One conversation with its newest messages (opening it marks it read). */
export function useConversation(id) {
  return useQuery({
    queryKey: [...WHATSAPP_KEY, 'chat', id],
    queryFn: ({ signal }) => apiRequest(`/whatsapp/conversations/${id}`, { signal }),
    select: (payload) => payload.data,
    enabled: Boolean(id),
  });
}

/** The messages before a moment ("Load older messages"). */
export function fetchOlderMessages(id, before) {
  return apiRequest(`/whatsapp/conversations/${id}?before=${encodeURIComponent(before)}`).then(
    (payload) => payload.data,
  );
}

/** Open (or make) the chat with a person of a company. Answers { conversationId, created }. */
export function useStartChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId) =>
      apiRequest(`/whatsapp/contacts/${contactId}/conversation`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WHATSAPP_KEY }),
  });
}

/** Everything a person does in one chat. The answer of a send is the chat itself. */
export function useChatActions(id) {
  const queryClient = useQueryClient();
  const base = `/whatsapp/conversations/${id}`;
  const showChat = (payload) => {
    queryClient.setQueryData([...WHATSAPP_KEY, 'chat', id], payload);
    queryClient.invalidateQueries({ queryKey: [...WHATSAPP_KEY, 'list'] });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };
  const reload = () => {
    queryClient.invalidateQueries({ queryKey: WHATSAPP_KEY });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };
  return {
    sendText: useMutation({
      mutationFn: (body) => apiRequest(`${base}/messages`, { method: 'POST', body }),
      onSuccess: showChat,
      onError: reload,
    }),
    sendFile: useMutation({
      mutationFn: ({ file, caption, replyToId }) => {
        const body = new FormData();
        body.append('file', file);
        if (caption) body.append('caption', caption);
        if (replyToId) body.append('replyToId', replyToId);
        return apiRequest(`${base}/files`, { method: 'POST', body });
      },
      onSuccess: showChat,
      onError: reload,
    }),
    sendDocument: useMutation({
      mutationFn: (body) => apiRequest(`${base}/documents`, { method: 'POST', body }),
      onSuccess: showChat,
      onError: reload,
    }),
    uploadHeader: useMutation({
      mutationFn: (file) => {
        const body = new FormData();
        body.append('file', file);
        return apiRequest(`${base}/template-header`, { method: 'POST', body });
      },
    }),
    sendTemplate: useMutation({
      mutationFn: (body) => apiRequest(`${base}/templates`, { method: 'POST', body }),
      onSuccess: showChat,
      onError: reload,
    }),
    markRead: useMutation({
      mutationFn: () => apiRequest(`${base}/read`, { method: 'POST' }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [...WHATSAPP_KEY, 'list'] }),
    }),
    assign: useMutation({
      mutationFn: (assignedTo) =>
        apiRequest(`${base}/assign`, { method: 'PATCH', body: { assignedTo } }),
      onSuccess: reload,
    }),
    link: useMutation({
      mutationFn: (contactId) =>
        apiRequest(`${base}/contact`, { method: 'PATCH', body: { contactId } }),
      onSuccess: reload,
    }),
    // The AI's help: "suggest" (what to answer) or "summary". It sends nothing.
    assist: useMutation({
      mutationFn: (kind) =>
        apiRequest(`${base}/assist`, { method: 'POST', body: { kind } }).then(
          (payload) => payload.data,
        ),
    }),
  };
}
