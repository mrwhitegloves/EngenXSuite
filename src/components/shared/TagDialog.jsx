import { useState } from 'react';
import { Plus, Tag as TagIcon } from 'lucide-react';
import { useTagActions, useTagsFor } from '../../hooks/useTags.js';
import Dialog from './Dialog.jsx';
import { TAG_COLOR_LABELS, TagChips } from './Tags.jsx';
import {
  FormError,
  compactInputClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './form.jsx';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Choose the tags of a record in a centred window, and make a new tag right there (anyone may,
 * founder decision 2026-10-15). Nothing is saved until "Done": the chosen ids go to onSave.
 * It holds no <form>, so it also works inside another form's window.
 *
 * @param {{ target: 'account' | 'contact' | 'opportunity', value: string[], title?: string,
 *           onSave: (ids: string[]) => void, onClose: () => void, isSaving?: boolean,
 *           error?: string }} props
 */
export function TagSelectDialog({
  target,
  value,
  title = 'Tags',
  onSave,
  onClose,
  isSaving = false,
  error,
}) {
  const tags = useTagsFor(target);
  const { create } = useTagActions();
  const [chosen, setChosen] = useState(value);
  const [text, setText] = useState('');
  const [color, setColor] = useState('');
  // Tags made in this window, shown before the list of tags has been read again.
  const [made, setMade] = useState([]);
  const all = [...tags, ...made.filter((tag) => !tags.some((item) => item.id === tag.id))];
  const shown = text.trim()
    ? all.filter((tag) => tag.name.toLowerCase().includes(text.trim().toLowerCase()))
    : all;
  const canMake = text.trim().length > 0 && !all.some((tag) => sameName(tag.name, text));
  const toggle = (id) =>
    setChosen(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);

  function makeTag() {
    if (!canMake || create.isPending) return;
    create.mutate(
      { name: text.trim(), ...(color ? { color } : {}) },
      {
        onSuccess: (payload) => {
          setMade([...made, payload.data]);
          setChosen([...chosen, payload.data.id]);
          setText('');
          setColor('');
        },
      },
    );
  }

  return (
    <Dialog
      open
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={isSaving}
            onClick={() => onSave(chosen)}
          >
            {isSaving ? 'Saving…' : 'Done'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <input
          aria-label="Find a tag, or type the name of a new one"
          placeholder="Find a tag, or type a new one"
          value={text}
          maxLength={40}
          autoFocus
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter makes the typed tag; it never sends a form around this window.
            if (event.key === 'Enter') {
              event.preventDefault();
              makeTag();
            }
          }}
          className={inputClass}
        />

        {canMake && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2">
            <select
              aria-label="Colour of the new tag"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className={compactInputClass}
            >
              <option value="">Grey</option>
              {Object.entries(TAG_COLOR_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={create.isPending}
              onClick={makeTag}
            >
              <Plus size={16} aria-hidden="true" />
              {create.isPending ? 'Making…' : `Make the tag “${text.trim()}”`}
            </button>
          </div>
        )}
        <FormError message={create.error?.message} />

        {all.length === 0 && !canMake && (
          <p className="text-sm text-text-muted">
            No tags yet. Type a name above to make the first one.
          </p>
        )}
        {shown.length > 0 && (
          <div role="group" aria-label="Tags to choose" className="flex flex-wrap gap-2">
            {shown.map((tag) => {
              const isOn = chosen.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(tag.id)}
                  className={[
                    'rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-brand',
                    isOn
                      ? 'border-brand bg-brand-soft font-medium text-brand-text'
                      : 'border-border bg-surface text-text-muted hover:border-text-muted',
                  ].join(' ')}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-text-muted">
          {chosen.length === 0
            ? 'No tag chosen.'
            : `${chosen.length} tag${chosen.length === 1 ? '' : 's'} chosen.`}{' '}
          Renaming and deleting tags is in Settings → Tags.
        </p>
        <FormError message={error} />
      </div>
    </Dialog>
  );
}

/**
 * The tags field of a form: the chosen tags, and a button that opens the tag window.
 * @param {{ target: 'account' | 'contact' | 'opportunity', value: string[],
 *           onChange: (ids: string[]) => void, label?: string }} props
 */
export function TagField({ target, value, onChange, label = 'Tags' }) {
  const tags = useTagsFor(target);
  const [isOpen, setIsOpen] = useState(false);
  const chosen = value.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TagChips tags={chosen} />
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-sm text-text-muted hover:border-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
        onClick={() => setIsOpen(true)}
      >
        <TagIcon size={14} aria-hidden="true" />
        {value.length === 0 ? `Add ${label.toLowerCase()}` : `Change ${label.toLowerCase()}`}
      </button>
      {isOpen && (
        <TagSelectDialog
          target={target}
          value={value}
          title={label}
          onClose={() => setIsOpen(false)}
          onSave={(ids) => {
            onChange(ids);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
