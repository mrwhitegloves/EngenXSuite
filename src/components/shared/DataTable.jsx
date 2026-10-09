import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

/**
 * The one table used by every list. Sorting happens on the server: clicking a sortable heading
 * only reports the new sort value ("name" → "-name" → "name"), the page then asks the API again.
 *
 * @param {{
 *   columns: { key: string, header: string, render: (row: object) => any, sortKey?: string,
 *              className?: string, hideHeader?: boolean }[],
 *   rows: object[],
 *   rowKey?: (row: object) => string,
 *   sort?: string,                      current sort, e.g. "-name"; '' = the list's default
 *   onSortChange?: (sort: string) => void,
 *   caption: string,                    read out by screen readers, e.g. "Users"
 *   isRefreshing?: boolean,             true while a new page loads over the old one
 * }} props
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  sort = '',
  onSortChange,
  caption,
  isRefreshing = false,
}) {
  const sortedKey = sort.replace(/^-/, '');
  const isDescending = sort.startsWith('-');

  return (
    // "relative": hidden screen-reader texts inside the table are positioned inside this box.
    // Without it they sit outside the scrolling area and make the whole page scroll sideways.
    <div
      className={`relative overflow-x-auto rounded-lg border border-border bg-surface transition-opacity ${isRefreshing ? 'opacity-60' : ''}`}
      aria-busy={isRefreshing}
    >
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border text-xs uppercase text-text-muted">
          <tr>
            {columns.map((column) => {
              const isSorted = column.sortKey && column.sortKey === sortedKey;
              const SortIcon = !isSorted ? ChevronsUpDown : isDescending ? ArrowDown : ArrowUp;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isSorted ? (isDescending ? 'descending' : 'ascending') : undefined}
                  className="px-4 py-2 font-medium whitespace-nowrap"
                >
                  {column.sortKey && onSortChange ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSortChange(
                          isSorted && !isDescending ? `-${column.sortKey}` : column.sortKey,
                        )
                      }
                      className={`inline-flex items-center gap-1 uppercase hover:text-text focus-visible:outline-2 focus-visible:outline-brand ${isSorted ? 'text-text' : ''}`}
                    >
                      {column.header}
                      <SortIcon size={13} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className={column.hideHeader ? 'sr-only' : ''}>{column.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border align-top last:border-0">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-2 ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
