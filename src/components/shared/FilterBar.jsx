import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { inputClass } from './form.jsx';
import SavedViews from './SavedViews.jsx';

const SEARCH_DELAY_MS = 350;

// The search box keeps what is being typed and reports it a moment after typing stops, so the
// list is not reloaded on every key.
function SearchBox({ value, placeholder, label, onChange }) {
  const [text, setText] = useState(value);
  // When the value changes from outside (Clear all, a saved view, the Back button), show it.
  // A change that came from the typing itself already matches and leaves the text alone.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== text.trim()) setText(value);
  }

  useEffect(() => {
    if (text.trim() === value) return undefined;
    const timer = setTimeout(() => onChange(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <input
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      className={`${inputClass} max-w-xs`}
    />
  );
}

/**
 * The one filter bar used above every list (Master Prompt Section 74): search box, the list's
 * own filter controls, saved views, and below them one removable chip per active filter with
 * "Clear all".
 *
 * @param {{
 *   search?: { value: string, onChange: (text: string) => void, placeholder: string, label: string },
 *   children?: any,                       the filter controls (selects, DateRangeFilter, …)
 *   chips?: { key: string, label: string, onRemove: () => void }[],
 *   onClearAll?: () => void,
 *   savedViews?: { screen: string, currentQuery: object, onApply: (query: object) => void },
 * }} props
 */
export default function FilterBar({ search, children, chips = [], onClearAll, savedViews }) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        {search && <SearchBox {...search} />}
        {children}
        {savedViews && (
          <div className="ml-auto">
            <SavedViews {...savedViews} />
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ul aria-label="Active filters" className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-0.5 pr-1 pl-3"
              >
                {chip.label}
                <button
                  type="button"
                  aria-label={`Remove filter: ${chip.label}`}
                  onClick={chip.onRemove}
                  className="rounded-full p-0.5 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-brand-text underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
