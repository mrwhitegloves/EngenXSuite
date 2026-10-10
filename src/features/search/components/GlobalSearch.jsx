import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, KanbanSquare, ListChecks, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/shared/Dialog.jsx';
import { FormError, inputClass } from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';

const TYPING_DELAY_MS = 300;
const MIN_LENGTH = 2;

// The kinds of result, in the order they are shown, and where a click on one goes.
const GROUPS = [
  { key: 'accounts', label: 'Companies', icon: Building2, to: (item) => `/accounts/${item.id}` },
  {
    key: 'contacts',
    label: 'People',
    icon: User,
    to: (item) => `/accounts/${item.accountId}?tab=people`,
  },
  { key: 'leads', label: 'Leads', icon: KanbanSquare, to: (item) => `/pipeline/${item.id}` },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: ListChecks,
    to: (item) => (item.leadId ? `/pipeline/${item.leadId}` : '/activities'),
  },
];

/** Companies, people, leads and tasks that match the text (the server applies my access). */
function useSearch(text) {
  return useQuery({
    queryKey: ['search', text],
    queryFn: ({ signal }) => apiRequest(`/search?q=${encodeURIComponent(text)}`, { signal }),
    select: (payload) => payload.data,
    enabled: text.length >= MIN_LENGTH,
    staleTime: 15_000,
  });
}

// The search itself: a box and the results below it, grouped by kind.
function SearchPanel({ onClose }) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  // The text that is searched for: what was typed, a moment after typing stops.
  const [text, setText] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setText(typed.trim()), TYPING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const search = useSearch(text);
  const groups = GROUPS.map((group) => ({ ...group, items: search.data?.[group.key] ?? [] }));
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  function open(path) {
    onClose();
    navigate(path);
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        autoFocus
        aria-label="Search everything"
        placeholder="Company, person, phone number, lead, task…"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        className={inputClass}
      />
      <FormError message={search.error?.message} />
      {text.length < MIN_LENGTH && (
        <p className="text-sm text-text-muted">
          Type at least {MIN_LENGTH} characters. A phone number can be typed in any form.
        </p>
      )}
      {text.length >= MIN_LENGTH && search.isPending && (
        <p role="status" className="text-sm text-text-muted">
          Searching…
        </p>
      )}
      {search.isSuccess && total === 0 && (
        <p className="text-sm text-text-muted">Nothing found for “{text}”.</p>
      )}

      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.key} aria-label={group.label}>
            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase">
              <group.icon size={13} aria-hidden="true" />
              {group.label}
            </h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => open(group.to(item))}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <span className="block font-medium break-words">
                      {item.name}
                      {(item.accountCode ?? item.leadCode) && (
                        <span className="ml-2 font-mono text-xs font-normal text-text-muted">
                          {item.accountCode ?? item.leadCode}
                        </span>
                      )}
                    </span>
                    {item.detail && (
                      <span className="block break-words text-text-muted">{item.detail}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

// Global search in the top bar: a button (also Ctrl+K) that opens the search.
export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        title="Search (Ctrl+K)"
        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand max-sm:px-2"
      >
        <Search size={16} aria-hidden="true" />
        <span className="max-md:hidden">Search…</span>
        <kbd className="rounded border border-border px-1 text-xs max-lg:hidden">Ctrl K</kbd>
      </button>
      {isOpen && (
        <Dialog open wide title="Search" onClose={() => setIsOpen(false)}>
          <SearchPanel onClose={() => setIsOpen(false)} />
        </Dialog>
      )}
    </>
  );
}
