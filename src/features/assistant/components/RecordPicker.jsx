import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inputClass } from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';

const GROUPS = [
  { key: 'leads', type: 'lead', word: 'Lead' },
  { key: 'accounts', type: 'account', word: 'Company' },
  { key: 'contacts', type: 'contact', word: 'Person' },
];

/**
 * Search for a lead, a company or a person to attach to the AI conversation. The search is the
 * global one, so it finds only what the person may see.
 * @param {{ onPick: (record: { type: string, id: string, title: string }) => void }} props
 */
export default function RecordPicker({ onPick }) {
  const [text, setText] = useState('');
  const term = text.trim();
  const search = useQuery({
    queryKey: ['search', term],
    queryFn: ({ signal }) => apiRequest(`/search?q=${encodeURIComponent(term)}`, { signal }),
    select: (payload) => payload.data,
    enabled: term.length >= 2,
    staleTime: 15_000,
  });
  const found = GROUPS.flatMap((group) =>
    (search.data?.[group.key] ?? []).slice(0, 4).map((item) => ({ ...item, group })),
  );

  return (
    <div className="space-y-1">
      <input
        type="search"
        aria-label="Attach a lead, a company or a person"
        placeholder="Attach a lead, a company or a person: type a name"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={`${inputClass} text-sm`}
      />
      {term.length >= 2 && search.isSuccess && found.length === 0 && (
        <p className="text-xs text-text-muted">Nothing matches.</p>
      )}
      {found.length > 0 && (
        <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {found.map((item) => (
            <li key={`${item.group.type}:${item.id}`}>
              <button
                type="button"
                className="block w-full px-2 py-1.5 text-left text-sm hover:bg-page"
                onClick={() => {
                  onPick({ type: item.group.type, id: item.id, title: item.name });
                  setText('');
                }}
              >
                <span className="text-xs text-text-muted">{item.group.word}: </span>
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
