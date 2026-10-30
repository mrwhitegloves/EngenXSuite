import { useState } from 'react';
import { Check, Copy, ExternalLink, Eye, EyeOff, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { compactInputClass, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useLinkActions, useLinks } from '../api.js';
import LinkDialog from '../components/LinkDialog.jsx';

const iconButton =
  'inline-flex items-center justify-center rounded-md p-1.5 text-text-muted hover:bg-page hover:text-text ' +
  'focus-visible:outline-2 focus-visible:outline-brand';

/** Copies text and shows a tick for two seconds. */
function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy this:', text);
      return;
    }
    setCopied(id);
    setTimeout(() => setCopied((current) => (current === id ? '' : current)), 2000);
  };
  return { copied, copy };
}

/** The address without "https://", for a short label. */
const shortUrl = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

function Credential({ linkId, index, item, copied, copy }) {
  const [shown, setShown] = useState(false);
  const id = `${linkId}-${index}`;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="min-w-0 shrink-0 text-text-muted">{item.key}</span>
      <span className="text-text-muted">=</span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={shown ? item.value : ''}>
        {item.value ? (shown ? item.value : '••••••••') : '—'}
      </span>
      {item.value && (
        <>
          <button
            type="button"
            className={iconButton}
            aria-label={shown ? `Hide ${item.key}` : `Show ${item.key}`}
            onClick={() => setShown(!shown)}
          >
            {shown ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={`Copy ${item.key}`}
            onClick={() => copy(id, item.value)}
          >
            {copied === id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>
        </>
      )}
    </div>
  );
}

function LinkCard({ link, canEdit, canDelete, onEdit, onDelete, copied, copy }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-32 items-center justify-center bg-page"
        aria-label={`Open ${link.name} in a new tab`}
      >
        {link.thumbnailUrl ? (
          <img src={link.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Link2 size={28} className="text-text-muted" aria-hidden="true" />
        )}
      </a>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 font-semibold">{link.name}</h2>
          <div className="flex shrink-0 gap-0.5">
            {canEdit && (
              <button
                type="button"
                className={iconButton}
                aria-label={`Edit ${link.name}`}
                onClick={onEdit}
              >
                <Pencil size={14} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className={`${iconButton} hover:text-danger`}
                aria-label={`Delete ${link.name}`}
                onClick={onDelete}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-sm text-brand-text hover:underline"
          >
            <span className="truncate">{shortUrl(link.url)}</span>
            <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
          </a>
          <button
            type="button"
            className={iconButton}
            aria-label={`Copy the address of ${link.name}`}
            title="Copy link"
            onClick={() => copy(link.id, link.url)}
          >
            {copied === link.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>
        </div>
        {link.description && <p className="text-sm text-text-muted">{link.description}</p>}
        {link.credentials.length > 0 && (
          <div className="mt-auto space-y-1 border-t border-border pt-2">
            {link.credentials.map((item, index) => (
              <Credential
                key={`${item.key}-${index}`}
                linkId={link.id}
                index={index}
                item={item}
                copied={copied}
                copy={copy}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/** The Links screen: the team's web addresses with credentials and a picture. */
export default function LinksPage() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const [text, setText] = useState(search);
  const [dialog, setDialog] = useState(null); // { link } | 'new'
  const [deleting, setDeleting] = useState(null);
  const { copied, copy } = useCopy();
  const links = useLinks({ search, page });
  const actions = useLinkActions();
  const items = links.data?.data ?? [];

  const setQuery = (next) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, String(value));
      else merged.delete(key);
    }
    setParams(merged, { replace: true });
  };

  return (
    <>
      <PageHeader title="Links" description="Useful web addresses, with their login details.">
        {can('links', 'create') && (
          <button type="button" className={primaryButtonClass} onClick={() => setDialog('new')}>
            <Plus size={16} /> New link
          </button>
        )}
      </PageHeader>

      <form
        className="mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery({ search: text.trim(), page: '' });
        }}
      >
        <input
          type="search"
          aria-label="Search links"
          placeholder="Search name, address or description"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={`${compactInputClass} w-full sm:max-w-sm`}
        />
      </form>

      {links.isError ? (
        <p className="text-danger">{links.error.message}</p>
      ) : links.isPending ? (
        <p className="text-text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={search ? 'No link matches' : 'No links yet'}
          description={search ? 'Try another word.' : 'Add the first link with "New link".'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              canEdit={can('links', 'edit')}
              canDelete={can('links', 'delete')}
              onEdit={() => setDialog({ link })}
              onDelete={() => setDeleting(link)}
              copied={copied}
              copy={copy}
            />
          ))}
        </div>
      )}
      <Pagination
        meta={links.data?.meta}
        noun={['link', 'links']}
        onPageChange={(next) => setQuery({ page: next })}
      />

      {dialog && (
        <LinkDialog
          link={dialog === 'new' ? null : dialog.link}
          actions={actions}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name ?? ''}?`}
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onConfirm={() => actions.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        onClose={() => setDeleting(null)}
      >
        The link, its login details and its picture are removed.
      </ConfirmDialog>
    </>
  );
}
