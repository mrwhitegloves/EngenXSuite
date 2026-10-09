import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The state of a list (filters, search, sort, date range, page) kept in the address bar
 * (Master Prompt Section 74), so a view survives a reload and can be bookmarked or shared.
 *
 *   const list = useListParams(['search', 'status', 'range', 'from', 'to']);
 *   list.values.status        current value, '' when not set
 *   list.setFilters({ status: 'active' })     changes filters and goes back to page 1
 *   list.setSort('-name'), list.setPage(3), list.clearFilters()
 *
 * Other address values (for example ?section= on the Settings page) are left alone.
 *
 * @param {string[]} filterKeys  The filter names this list uses
 */
export function useListParams(filterKeys) {
  const [searchParams, setSearchParams] = useSearchParams();
  // The caller passes a fixed list; joining it gives a stable value to depend on.
  const keyList = filterKeys.join(',');

  const values = useMemo(
    () => Object.fromEntries(keyList.split(',').map((key) => [key, searchParams.get(key) ?? ''])),
    [keyList, searchParams],
  );
  const sort = searchParams.get('sort') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const update = useCallback(
    (changes) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setFilters = useCallback((changes) => update({ ...changes, page: '' }), [update]);
  const setSort = useCallback((value) => update({ sort: value, page: '' }), [update]);
  const setPage = useCallback(
    (number) => update({ page: number > 1 ? String(number) : '' }),
    [update],
  );
  const clearFilters = useCallback(
    () => update({ ...Object.fromEntries(keyList.split(',').map((key) => [key, ''])), page: '' }),
    [keyList, update],
  );
  /** Replace filters and sort in one step: used to apply a saved view. */
  const applyView = useCallback(
    (query) =>
      update({
        ...Object.fromEntries(keyList.split(',').map((key) => [key, query[key] ?? ''])),
        sort: query.sort ?? '',
        page: '',
      }),
    [keyList, update],
  );

  const activeFilters = Object.fromEntries(Object.entries(values).filter(([, value]) => value));
  return {
    values,
    sort,
    page,
    activeFilters,
    hasFilters: Object.keys(activeFilters).length > 0,
    // What a saved view stores: the filters in use plus the sort.
    viewQuery: { ...activeFilters, ...(sort ? { sort } : {}) },
    setFilters,
    setSort,
    setPage,
    clearFilters,
    applyView,
  };
}
