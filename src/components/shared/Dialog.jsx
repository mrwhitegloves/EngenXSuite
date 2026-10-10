import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * A centred modal dialog built on the browser's own <dialog> element, which gives focus
 * trapping, Escape to close and a backdrop without extra code.
 */
// `wide`: for forms with two columns of fields.
export default function Dialog({ open, title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the dark area around the dialog closes it.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/50 overflow-hidden max-sm:m-0 max-sm:h-full max-sm:max-h-full max-sm:max-w-full max-sm:rounded-none`}
    >
      {open && (
        // The dialog never grows taller than the screen: the title and the footer stay in
        // place and only the middle part scrolls, however long the form is.
        <div className="flex max-h-[calc(100dvh-3rem)] flex-col max-sm:h-full max-sm:max-h-full">
          <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
