import { useState } from 'react';
import { Layers, Plus, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useBundleActions, useBundles, useSendings } from '../api.js';
import BundleDetail from '../components/BundleDetail.jsx';
import NewSendingDialog from '../components/NewSendingDialog.jsx';
import OptOutList from '../components/OptOutList.jsx';
import SendingDetail, { SENDING_STATUS } from '../components/SendingDetail.jsx';
import { formatDateTime } from '../../../lib/dates.js';

const TABS = [
  { id: 'sendings', label: 'Sendings' },
  { id: 'bundles', label: 'Bundles' },
  { id: 'stopped', label: 'Do not write to' },
];

function BundleList({ onOpen }) {
  const can = useCan();
  const [page, setPage] = useState(1);
  const bundles = useBundles({ page });
  const { create } = useBundleActions();
  const [name, setName] = useState(null); // null: the "new bundle" box is closed
  const rows = bundles.data?.data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted">
          Lists of people and companies to write to in one go. Make one here, or choose companies on
          the Accounts screen and press “Make a bundle”.
        </p>
        {can('campaigns', 'create') && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              create.reset();
              setName('');
            }}
          >
            <Plus size={16} aria-hidden="true" />
            New empty bundle
          </button>
        )}
      </div>
      <FormError message={bundles.error?.message} />
      {bundles.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No bundles yet"
          description="A bundle is a named list of people and companies. It is what a bulk mail or a bulk WhatsApp message is sent to."
        />
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden">
        {rows.map((bundle) => (
          <li key={bundle.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => onOpen(bundle.id)}
            >
              <Layers size={16} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{bundle.name}</span>
                <span className="block text-xs text-text-muted">
                  {bundle.memberCount} {bundle.memberCount === 1 ? 'address' : 'addresses'} · made{' '}
                  {formatDateTime(bundle.createdAt)}
                  {bundle.createdBy && ` by ${bundle.createdBy}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Pagination meta={bundles.data?.meta} noun={['bundle', 'bundles']} onPageChange={setPage} />
      {name !== null && (
        <Dialog open title="New bundle" onClose={() => setName(null)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate(
                { name: name.trim() },
                { onSuccess: (payload) => onOpen(payload.data.id) },
              );
            }}
          >
            <input
              aria-label="Name of the bundle"
              autoFocus
              maxLength={120}
              placeholder="Name of the bundle"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
            <FormError message={create.error?.message} />
            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setName(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={!name.trim() || create.isPending}
              >
                Make it
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function SendingList({ onOpen }) {
  const [page, setPage] = useState(1);
  const sendings = useSendings(page);
  const rows = sendings.data?.data ?? [];
  return (
    <div className="space-y-3">
      <FormError message={sendings.error?.message} />
      {sendings.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Send}
          title="Nothing was sent in bulk yet"
          description="Make a bundle, then press “New sending”. Every sending keeps a full record of who got what."
        />
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden">
        {rows.map((sending) => (
          <li key={sending.id}>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => onOpen(sending.id)}
            >
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium break-words">{sending.name}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${sending.status === 'running' ? 'border-brand text-brand-text' : 'border-border text-text-muted'}`}
                >
                  {SENDING_STATUS[sending.status]}
                </span>
              </span>
              <span className="block text-xs text-text-muted">
                {sending.channel === 'email' ? 'Mail' : 'WhatsApp'} · to “{sending.bundleName}” ·{' '}
                {sending.counts.sent} sent, {sending.counts.failed} not sent,{' '}
                {sending.counts.skipped} skipped, {sending.counts.pending} waiting · made{' '}
                {formatDateTime(sending.createdAt)}
                {sending.sender && ` by ${sending.sender}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Pagination
        meta={sendings.data?.meta}
        noun={['sending', 'sendings']}
        onPageChange={setPage}
      />
    </div>
  );
}

// Bulk send: bundles (who to write to) and sendings (what was sent, to whom, and what happened).
export default function BulkPage() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const bundleId = params.get('bundle');
  const sendingId = params.get('send');
  const tab = TABS.find((item) => item.id === params.get('tab')) ?? (bundleId ? TABS[1] : TABS[0]);
  // null: closed. Otherwise the bundle a new sending is for (undefined: to be chosen).
  const [composing, setComposing] = useState(null);
  const go = (next) => setParams(next);

  return (
    <>
      <PageHeader
        title="Bulk send"
        description="One mail or one WhatsApp message to many people, with a record of every one."
      >
        {can('campaigns', 'create') && !sendingId && (
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => setComposing({ bundle: undefined })}
          >
            <Send size={16} aria-hidden="true" />
            New sending
          </button>
        )}
      </PageHeader>

      {!bundleId && !sendingId && (
        <div
          role="tablist"
          aria-label="Bulk send"
          className="mb-4 flex flex-wrap gap-1 border-b border-border"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === tab.id}
              onClick={() => go(item.id === TABS[0].id ? {} : { tab: item.id })}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand ${item.id === tab.id ? 'border-brand text-brand-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {sendingId ? (
        <SendingDetail
          key={sendingId}
          sendingId={sendingId}
          onBack={() => go({})}
          onOpenBundle={(id) => go({ bundle: id })}
        />
      ) : bundleId ? (
        <BundleDetail
          key={bundleId}
          bundleId={bundleId}
          onBack={() => go({ tab: 'bundles' })}
          onSend={(bundle) => setComposing({ bundle })}
        />
      ) : tab.id === 'bundles' ? (
        <BundleList onOpen={(id) => go({ bundle: id })} />
      ) : tab.id === 'stopped' ? (
        <OptOutList />
      ) : (
        <SendingList onOpen={(id) => go({ send: id })} />
      )}

      {composing && (
        <NewSendingDialog
          bundle={composing.bundle}
          onClose={() => setComposing(null)}
          onMade={(id) => {
            setComposing(null);
            go({ send: id });
          }}
        />
      )}
    </>
  );
}
