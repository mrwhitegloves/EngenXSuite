import { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { useDeleteView, useSaveView, useSavedViews } from '../../hooks/useSavedViews.js';
import Dialog from './Dialog.jsx';
import { Field, FormError, inputClass, primaryButtonClass, secondaryButtonClass } from './form.jsx';

const sameQuery = (a, b) => {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.every((name) => (a[name] ?? '') === (b[name] ?? ''));
};

/**
 * Saved views of one list: pick one to apply its filters, save the current filters under a
 * name, or delete one. Each user has their own.
 *
 * @param {{ screen: string, currentQuery: Record<string, string>,
 *           onApply: (query: Record<string, string>) => void }} props
 */
export default function SavedViews({ screen, currentQuery, onApply }) {
  const views = useSavedViews(screen);
  const saveView = useSaveView(screen);
  const deleteView = useDeleteView(screen);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');

  const list = views.data ?? [];
  // The view whose filters are exactly what is on screen now, if any.
  const current = list.find((view) => sameQuery(view.query, currentQuery));
  const hasSomethingToSave = Object.keys(currentQuery).length > 0;

  function save(event) {
    event.preventDefault();
    saveView.mutate(
      { name: name.trim(), query: currentQuery },
      {
        onSuccess: () => {
          setName('');
          setIsOpen(false);
        },
      },
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {list.length > 0 && (
          <select
            aria-label="Saved views"
            value={current?.id ?? ''}
            onChange={(event) => {
              const view = list.find((item) => item.id === event.target.value);
              if (view) onApply(view.query);
            }}
            className={`${inputClass} w-auto`}
          >
            <option value="">Saved views</option>
            {list.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setIsOpen(true)}
          disabled={!hasSomethingToSave && list.length === 0}
          title="Save these filters, or manage saved views"
        >
          <Bookmark size={16} aria-hidden="true" />
          {list.length > 0 ? 'Views' : 'Save view'}
        </button>
      </div>

      <Dialog open={isOpen} title="Saved views" onClose={() => setIsOpen(false)}>
        <div className="space-y-5">
          {hasSomethingToSave ? (
            <form onSubmit={save} className="space-y-3">
              <Field
                label="Save the current filters as"
                hint="Using a name again replaces that view."
              >
                {(props) => (
                  <input
                    {...props}
                    value={name}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="For example: Active users"
                    className={inputClass}
                  />
                )}
              </Field>
              <FormError message={saveView.error?.message} />
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={!name.trim() || saveView.isPending}
              >
                {saveView.isPending ? 'Saving…' : 'Save view'}
              </button>
            </form>
          ) : (
            <p className="text-text-muted">
              Choose some filters or a sort order first; then they can be saved here.
            </p>
          )}

          {list.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Your views</h3>
              <FormError message={deleteView.error?.message} />
              <ul className="divide-y divide-border rounded-md border border-border">
                {list.map((view) => (
                  <li key={view.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <button
                      type="button"
                      className="text-left hover:text-brand-text focus-visible:outline-2 focus-visible:outline-brand"
                      onClick={() => {
                        onApply(view.query);
                        setIsOpen(false);
                      }}
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete the view ${view.name}`}
                      disabled={deleteView.isPending}
                      onClick={() => deleteView.mutate(view.id)}
                      className="rounded p-1 text-text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
