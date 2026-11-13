import { useEffect, useId, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, Search, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient.js';
import { inputClass } from './form.jsx';

// Choosing one company (Account) by typing part of its name, code or city. The list comes from
// GET /api/accounts, so it holds only the companies the person may see. Used wherever a screen
// needs "which company?" (first: the Document generator, founder 2026-11-12).
//
// onSelect receives the list item { id, accountCode, name, city, … }; a caller that needs the
// whole company (address …) loads it with GET /api/accounts/:id.

function useAccountSearch(text, enabled) {
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const query = new URLSearchParams({ page: '1', pageSize: '8', sort: 'name' });
  if (debounced) query.set('search', debounced);
  return useQuery({
    queryKey: ['accounts', 'picker', debounced],
    queryFn: ({ signal }) => apiRequest(`/accounts?${query}`, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * @param {{ label: string, selectedName?: string, onSelect: (account: object) => void,
 *           onClear?: () => void, disabled?: boolean, hint?: string }} props
 *   selectedName  the company chosen now (shown with a "Remove" button), if any
 */
export default function AccountPicker({ label, selectedName, onSelect, onClear, disabled, hint }) {
  const id = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const { data, isFetching, error } = useAccountSearch(text, open);
  const items = data?.data ?? [];

  // A click outside closes the list.
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (account) => {
    onSelect(account);
    setText('');
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && items[active]) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {selectedName && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-page px-3 py-1.5 text-sm">
          <Building2 size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{selectedName}</span>
          {onClear && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="rounded p-0.5 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
              aria-label={`Remove ${selectedName}`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${id}-${items[active].id}` : undefined}
          autoComplete="off"
          disabled={disabled}
          className={`${inputClass} pl-8 text-sm`}
          placeholder={
            selectedName ? 'Choose another company' : 'Type a company name, code or city'
          }
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {error && <li className="px-3 py-2 text-sm text-danger">{error.message}</li>}
          {!error && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-text-muted">
              {isFetching ? 'Searching…' : 'No company found'}
            </li>
          )}
          {items.map((account, index) => (
            <li
              key={account.id}
              id={`${id}-${account.id}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(account)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-brand-soft' : ''}`}
            >
              <span className="block font-medium">{account.name}</span>
              <span className="block text-xs text-text-muted">
                {[account.accountCode, account.city, account.industry].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
