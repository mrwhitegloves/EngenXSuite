import { useState } from 'react';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useDocuments } from '../api.js';
import { formatSize } from '../format.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

/**
 * Walk through the folders of the documents library and pick files: for a mail's attachments.
 * @param {{ chosen: { url: string }[], onPick: (document: object) => void }} props
 *        chosen: files that are picked already (shown as "Added")
 */
export default function DocumentPicker({ chosen, onPick }) {
  const [folderId, setFolderId] = useState('');
  const [search, setSearch] = useState('');
  const library = useDocuments({ folderId, search: search.trim() });
  const data = library.data;
  const isEmpty = data && data.folders.length === 0 && data.documents.length === 0;

  return (
    <section
      aria-label="Documents"
      className="space-y-2 rounded-md border border-border p-2 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Folder" className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <button
            type="button"
            className="font-medium hover:text-brand-text hover:underline"
            onClick={() => {
              setFolderId('');
              setSearch('');
            }}
          >
            Documents
          </button>
          {!search.trim() &&
            (data?.path ?? []).map((step) => (
              <span key={step.id} className="flex items-center gap-1">
                <ChevronRight size={12} aria-hidden="true" className="text-text-muted" />
                <button
                  type="button"
                  className="hover:text-brand-text hover:underline"
                  onClick={() => setFolderId(step.id)}
                >
                  {step.name}
                </button>
              </span>
            ))}
        </nav>
        <input
          type="search"
          aria-label="Search documents"
          placeholder="Search all documents"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={`${compactInputClass} text-sm`}
        />
      </div>
      <FormError message={library.error?.message} />
      {library.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {isEmpty && (
        <p className="text-text-muted">
          {search.trim()
            ? 'No document has this in its name.'
            : 'Nothing here. Files are added on the “Documents” screen.'}
        </p>
      )}
      <ul className="max-h-56 divide-y divide-border overflow-y-auto">
        {(data?.folders ?? []).map((folder) => (
          <li key={folder.id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 py-1.5 text-left hover:text-brand-text"
              onClick={() => setFolderId(folder.id)}
            >
              <Folder size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              <span className="text-xs text-text-muted">
                {folder.documentCount} {folder.documentCount === 1 ? 'file' : 'files'}
              </span>
              <ChevronRight size={14} aria-hidden="true" className="text-text-muted" />
            </button>
          </li>
        ))}
        {(data?.documents ?? []).map((document) => {
          const isAdded = chosen.some((item) => item.url === document.url);
          return (
            <li key={document.id} className="flex items-center gap-2 py-1.5">
              <FileText size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{document.name}</span>
                <span className="block text-xs text-text-muted">{formatSize(document.size)}</span>
              </span>
              <button
                type="button"
                className={smallButton}
                disabled={isAdded}
                onClick={() =>
                  onPick({
                    id: document.id,
                    url: document.url,
                    filename: document.filename,
                    mimeType: document.mimeType,
                    size: document.size,
                  })
                }
              >
                {isAdded ? 'Added' : 'Attach'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
