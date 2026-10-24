import { useState } from 'react';
import { Ban, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  fieldErrorsFrom,
  inputClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useOptOutActions, useOptOuts } from '../api.js';
import { formatDateTime } from '../../../lib/dates.js';

const CHANNEL_WORDS = { email: 'Mail', whatsapp: 'WhatsApp' };
const SOURCE_WORDS = {
  link: 'They used the link in a bulk mail',
  message: 'They wrote STOP on WhatsApp',
};

// "Do not write to": the addresses and numbers that never get a bulk mail or a bulk WhatsApp
// message. A customer gets on it by themselves (the link in a bulk mail, STOP on WhatsApp),
// or one of us puts them on it.
export default function OptOutList() {
  const can = useCan();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ channel: 'email', address: '', note: '' });
  const [removing, setRemoving] = useState(null);
  const list = useOptOuts({ page, search: search.trim() });
  const { add, remove } = useOptOutActions();
  const rows = list.data?.data ?? [];
  const errors = fieldErrorsFrom(add.error);

  function submit(event) {
    event.preventDefault();
    add.mutate(
      {
        channel: form.channel,
        address: form.address.trim(),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      },
      { onSuccess: () => setForm({ ...form, address: '', note: '' }) },
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-text-muted">
        Nobody on this list gets a bulk mail or a bulk WhatsApp message; a sending skips them and
        says so. A normal, single mail or message to them still works.
      </p>

      {can('campaigns', 'create') && (
        <form
          onSubmit={submit}
          className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-surface p-3"
        >
          <select
            aria-label="Mail or WhatsApp"
            value={form.channel}
            onChange={(event) => setForm({ ...form, channel: event.target.value })}
            className={compactInputClass}
          >
            <option value="email">Mail address</option>
            <option value="whatsapp">WhatsApp number</option>
          </select>
          <input
            aria-label={form.channel === 'email' ? 'Email address' : 'Phone number'}
            placeholder={form.channel === 'email' ? 'name@company.com' : '98765 43210'}
            value={form.address}
            maxLength={320}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            className={`${inputClass} min-w-48 flex-1 sm:max-w-xs`}
          />
          <input
            aria-label="Why (optional)"
            placeholder="Why (optional)"
            value={form.note}
            maxLength={300}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            className={`${inputClass} min-w-48 flex-1 sm:max-w-xs`}
          />
          <button
            type="submit"
            className={secondaryButtonClass}
            disabled={!form.address.trim() || add.isPending}
          >
            <Plus size={16} aria-hidden="true" />
            Put on the list
          </button>
          <div className="basis-full">
            <FormError message={errors.address ?? add.error?.message} />
          </div>
        </form>
      )}

      <input
        aria-label="Search the list"
        placeholder="Search an address or a number"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className={`${inputClass} sm:max-w-xs`}
      />
      <FormError message={list.error?.message} />
      {list.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Ban}
          title={search.trim() ? 'Nothing on the list matches' : 'Nobody is on the list'}
          description="Someone gets on it by the link at the foot of a bulk mail, by writing STOP on WhatsApp, or when you put them on it here."
        />
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface empty:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Ban size={16} aria-hidden="true" className="shrink-0 text-text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium break-all">{row.address}</span>
              <span className="block text-xs text-text-muted">
                {CHANNEL_WORDS[row.channel]} · since {formatDateTime(row.createdAt)} ·{' '}
                {SOURCE_WORDS[row.source] ?? `Put on the list by ${row.addedBy ?? 'a colleague'}`}
                {row.note && ` · ${row.note}`}
              </span>
            </span>
            {can('campaigns', 'edit') && (
              <button
                type="button"
                aria-label={`Take ${row.address} off the list`}
                className="rounded-md p-1.5 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                onClick={() => {
                  remove.reset();
                  setRemoving(row);
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Pagination meta={list.data?.meta} noun={['address', 'addresses']} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(removing)}
        title="Take off the list?"
        confirmLabel="Take off the list"
        isBusy={remove.isPending}
        error={remove.error?.message}
        onClose={() => setRemoving(null)}
        onConfirm={() => remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      >
        <p>
          {removing?.address} will get bulk {removing?.channel === 'email' ? 'mails' : 'messages'}{' '}
          again. Do this only when they agreed to it.
        </p>
      </ConfirmDialog>
    </div>
  );
}
