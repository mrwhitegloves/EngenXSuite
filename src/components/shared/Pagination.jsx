import { secondaryButtonClass } from './form.jsx';

/**
 * "Page 2 of 5 · 112 users" with Previous and Next. Shown only when there is something to count.
 * @param {{ meta?: { page: number, pageSize: number, total: number }, noun: [string, string],
 *           onPageChange: (page: number) => void }} props
 *        noun: singular and plural of what is listed, e.g. ['user', 'users']
 */
export default function Pagination({ meta, noun, onPageChange }) {
  if (!meta || meta.total === 0) return null;
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  return (
    <nav aria-label="Pages" className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="text-text-muted">
        Page {meta.page} of {pageCount} · {meta.total.toLocaleString('en-IN')}{' '}
        {meta.total === 1 ? noun[0] : noun[1]}
      </span>
      {pageCount > 1 && (
        <>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={meta.page >= pageCount}
            onClick={() => onPageChange(meta.page + 1)}
          >
            Next
          </button>
        </>
      )}
    </nav>
  );
}
