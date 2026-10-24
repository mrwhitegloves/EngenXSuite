import { useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  Field,
  FormError,
  compactInputClass,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useAllFolders, useDocumentActions, useDocuments } from '../api.js';
import { formatSize } from '../format.js';
import { formatDateTime } from '../../../lib/dates.js';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand';

// One text field: the name of a new folder, or a new name for a folder or a document.
function NameDialog({ title, label, start = '', saveLabel, action, toBody, onClose }) {
  const [name, setName] = useState(start);
  const errors = fieldErrorsFrom(action.error);
  return (
    <Dialog open title={title} onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate(toBody(name.trim()), { onSuccess: onClose });
        }}
      >
        <Field label={label} error={errors.name}>
          {(props) => (
            <input
              {...props}
              autoFocus
              maxLength={200}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <FormError message={Object.keys(errors).length === 0 ? action.error?.message : null} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!name.trim() || action.isPending}
          >
            {action.isPending ? 'Saving…' : saveLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Put a document into another folder.
function MoveDialog({ document, action, onClose }) {
  const folders = useAllFolders();
  const [folderId, setFolderId] = useState(document.folderId ?? '');
  return (
    <Dialog open title={`Move “${document.name}”`} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">To the folder</span>
          <select
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            className={inputClass}
          >
            <option value="">Documents (the top)</option>
            {(folders.data ?? []).map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
        </label>
        <FormError message={folders.error?.message ?? action.error?.message} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={action.isPending}
            onClick={() =>
              action.mutate({ id: document.id, folderId: folderId || null }, { onSuccess: onClose })
            }
          >
            {action.isPending ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// Documents: the one library of the CRM. Files of any kind, kept in folders the team makes
// itself; opened and downloaded here, and attached to a mail from the mail screen.
export default function DocumentsPage() {
  const can = useCan();
  const canAdd = can('documents', 'create');
  const canArrange = can('documents', 'edit');
  const [params, setParams] = useSearchParams();
  const folderId = params.get('folder') ?? '';
  const [search, setSearch] = useState('');
  const library = useDocuments({ folderId, search: search.trim() });
  const actions = useDocumentActions();
  const picker = useRef(null);
  // What is open: { kind: 'new-folder' | 'rename-folder' | 'rename' | 'move' | 'delete' |
  // 'delete-folder', item? }
  const [dialog, setDialog] = useState(null);
  const open = (kind, item) => {
    Object.values(actions).forEach((action) => action.reset());
    setDialog({ kind, item });
  };
  const close = () => setDialog(null);
  const goTo = (id) => {
    setSearch('');
    setParams(id ? { folder: id } : {});
  };
  const data = library.data;
  const isSearching = Boolean(search.trim());
  const isEmpty = data && data.folders.length === 0 && data.documents.length === 0;

  return (
    <>
      <PageHeader
        title="Documents"
        description="The files of your company, in your own folders. Send them with a mail from the mail screen."
      >
        {canAdd && (
          <>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => open('new-folder')}
            >
              <FolderPlus size={16} aria-hidden="true" />
              New folder
            </button>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              aria-label="Files from your device"
              onChange={(event) => {
                const picked = [...event.target.files];
                event.target.value = '';
                for (const file of picked) actions.upload.mutate({ file, folderId });
              }}
            />
            <button
              type="button"
              className={primaryButtonClass}
              disabled={actions.upload.isPending}
              onClick={() => picker.current.click()}
            >
              <Upload size={16} aria-hidden="true" />
              {actions.upload.isPending ? 'Uploading…' : 'Add files'}
            </button>
          </>
        )}
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav aria-label="Folder" className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <button
            type="button"
            className={`hover:text-brand-text hover:underline ${folderId ? '' : 'font-semibold'}`}
            onClick={() => goTo('')}
          >
            Documents
          </button>
          {!isSearching &&
            (data?.path ?? []).map((step, index, path) => (
              <span key={step.id} className="flex items-center gap-1">
                <ChevronRight size={14} aria-hidden="true" className="text-text-muted" />
                <button
                  type="button"
                  className={`hover:text-brand-text hover:underline ${index === path.length - 1 ? 'font-semibold' : ''}`}
                  onClick={() => goTo(step.id)}
                >
                  {step.name}
                </button>
              </span>
            ))}
          {isSearching && <span className="text-text-muted">· search in every folder</span>}
        </nav>
        <input
          type="search"
          aria-label="Search documents"
          placeholder="Search all documents"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={compactInputClass}
        />
      </div>
      <FormError message={library.error?.message ?? actions.upload.error?.message} />
      {library.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {isEmpty && (
        <EmptyState
          icon={FileText}
          title={isSearching ? 'No document has this in its name' : 'Nothing here yet'}
          description={
            isSearching
              ? 'Try another word.'
              : 'Add files (up to 25 MB each), or make a folder to keep them in order.'
          }
        />
      )}

      <ul
        aria-label="Folders and documents"
        className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden"
      >
        {(data?.folders ?? []).map((folder) => (
          <li key={folder.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-brand-text focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => goTo(folder.id)}
            >
              <Folder size={17} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{folder.name}</span>
                <span className="block text-xs text-text-muted">
                  Folder · {folder.documentCount} {folder.documentCount === 1 ? 'file' : 'files'}
                </span>
              </span>
            </button>
            {canArrange && (
              <>
                <button
                  type="button"
                  aria-label={`Rename the folder ${folder.name}`}
                  className={rowButton}
                  onClick={() => open('rename-folder', folder)}
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete the folder ${folder.name}`}
                  className={rowButton}
                  onClick={() => open('delete-folder', folder)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
        {(data?.documents ?? []).map((document) => (
          <li key={document.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <a
              href={document.link}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2 hover:text-brand-text"
            >
              <FileText size={17} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{document.name}</span>
                <span className="block truncate text-xs text-text-muted">
                  {formatSize(document.size)} · added {formatDateTime(document.createdAt)}
                  {document.uploadedBy && ` by ${document.uploadedBy}`}
                </span>
              </span>
            </a>
            <a
              href={document.link}
              target="_blank"
              rel="noreferrer"
              download={document.filename}
              className={rowButton}
            >
              <Download size={12} aria-hidden="true" />
              Open / download
            </a>
            {canArrange && (
              <>
                <button
                  type="button"
                  aria-label={`Rename ${document.name}`}
                  className={rowButton}
                  onClick={() => open('rename', document)}
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
                <button type="button" className={rowButton} onClick={() => open('move', document)}>
                  <FolderInput size={12} aria-hidden="true" />
                  Move
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${document.name}`}
                  className={rowButton}
                  onClick={() => open('delete', document)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {dialog?.kind === 'new-folder' && (
        <NameDialog
          title="New folder"
          label="Name of the folder"
          saveLabel="Make the folder"
          action={actions.createFolder}
          toBody={(name) => ({ name, ...(folderId ? { parentId: folderId } : {}) })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'rename-folder' && (
        <NameDialog
          title="Rename the folder"
          label="Name of the folder"
          start={dialog.item.name}
          saveLabel="Save"
          action={actions.renameFolder}
          toBody={(name) => ({ id: dialog.item.id, name })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'rename' && (
        <NameDialog
          title="Rename the document"
          label="Name"
          start={dialog.item.name}
          saveLabel="Save"
          action={actions.update}
          toBody={(name) => ({ id: dialog.item.id, name })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'move' && (
        <MoveDialog document={dialog.item} action={actions.update} onClose={close} />
      )}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title="Delete this document?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={close}
        onConfirm={() => actions.remove.mutate(dialog.item.id, { onSuccess: close })}
      >
        <p>
          <strong>{dialog?.item?.name}</strong> will be taken out of Documents. Mails that were sent
          with it keep their own copy.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog?.kind === 'delete-folder'}
        title="Delete this folder?"
        confirmLabel="Delete the folder"
        isBusy={actions.removeFolder.isPending}
        error={actions.removeFolder.error?.message}
        onClose={close}
        onConfirm={() => actions.removeFolder.mutate(dialog.item.id, { onSuccess: close })}
      >
        <p>
          <strong>{dialog?.item?.name}</strong> will be removed. Only an empty folder can be
          deleted: move or delete what is in it first.
        </p>
      </ConfirmDialog>
    </>
  );
}
