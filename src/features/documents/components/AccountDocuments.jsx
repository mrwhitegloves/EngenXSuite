import { useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useAccountDocuments, useDocumentActions } from '../api.js';

const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const formatDay = (value) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(
    new Date(value),
  );

/**
 * The "Documents" tab of a company: files kept in the CRM for it (offers, drawings, brochures,
 * orders). They open from here and can be sent with a mail ("From the company's files").
 * @param {{ accountId: string }} props
 */
export default function AccountDocuments({ accountId }) {
  const can = useCan();
  const documents = useAccountDocuments(accountId);
  const { upload, remove } = useDocumentActions(accountId);
  const picker = useRef(null);
  const [deleting, setDeleting] = useState(null);
  const rows = documents.data ?? [];

  return (
    <section aria-label="Documents" className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted">
          Files kept for this company. Up to 25 MB each. You can send them with a mail.
        </p>
        {can('documents', 'create') && (
          <>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              aria-label="Documents from your device"
              onChange={(event) => {
                const picked = [...event.target.files];
                event.target.value = '';
                for (const file of picked) upload.mutate(file);
              }}
            />
            <button
              type="button"
              className={primaryButtonClass}
              disabled={upload.isPending}
              onClick={() => picker.current.click()}
            >
              <Upload size={16} aria-hidden="true" />
              {upload.isPending ? 'Uploading…' : 'Add documents'}
            </button>
          </>
        )}
      </div>
      <FormError message={documents.error?.message ?? upload.error?.message} />
      {documents.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {documents.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Add an offer, a drawing or a brochure, and it is at hand when you write to this company."
        />
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden">
        {rows.map((document) => (
          <li key={document.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <FileText size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
            <a
              href={document.link}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 hover:text-brand-text"
            >
              <span className="block truncate font-medium">{document.name}</span>
              <span className="block truncate text-xs text-text-muted">
                {formatSize(document.size)} · added {formatDay(document.createdAt)}
                {document.uploadedBy && ` by ${document.uploadedBy}`}
              </span>
            </a>
            {can('documents', 'edit') && (
              <button
                type="button"
                aria-label={`Delete ${document.name}`}
                className="rounded p-1 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                onClick={() => {
                  remove.reset();
                  setDeleting(document);
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this document?"
        confirmLabel="Delete"
        isBusy={remove.isPending}
        error={remove.error?.message}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      >
        <p>
          <strong>{deleting?.name}</strong> will be taken off this company’s documents. Mails that
          were sent with it keep their own copy.
        </p>
      </ConfirmDialog>
    </section>
  );
}
