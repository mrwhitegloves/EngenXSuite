import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient.js';

// Tags: the labels put on companies and people. Every signed-in person reads them (the pickers
// need the names); only someone with the "settings" permission changes the list.
export const TAGS_KEY = ['tags'];

/**
 * Every tag, by name.
 * @param {{ withUses?: boolean }} [options]  withUses: also how many records carry each tag
 */
export function useTags({ withUses = false } = {}) {
  return useQuery({
    queryKey: [...TAGS_KEY, withUses ? 'with-uses' : 'list'],
    queryFn: ({ signal }) => apiRequest(`/tags${withUses ? '?withUses=true' : ''}`, { signal }),
    select: (payload) => payload.data,
  });
}

/** The tags offered for one kind of record: 'account' or 'contact'. */
export function useTagsFor(target) {
  const tags = useTags();
  return (tags.data ?? []).filter((tag) => tag.appliesTo.includes(target));
}

/** The changes to the tag list. Each one reloads the tags and the records that show them. */
export function useTagActions() {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    [TAGS_KEY, ['accounts'], ['contacts']].forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    );
  const action = (mutationFn) => ({ mutationFn, onSuccess });
  return {
    create: useMutation(action((body) => apiRequest('/tags', { method: 'POST', body }))),
    update: useMutation(
      action(({ id, ...body }) => apiRequest(`/tags/${id}`, { method: 'PATCH', body })),
    ),
    merge: useMutation(
      action(({ id, intoTagId }) =>
        apiRequest(`/tags/${id}/merge`, { method: 'POST', body: { intoTagId } }),
      ),
    ),
    remove: useMutation(action((id) => apiRequest(`/tags/${id}`, { method: 'DELETE' }))),
  };
}
