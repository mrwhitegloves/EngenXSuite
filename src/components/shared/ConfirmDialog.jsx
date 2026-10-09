import Dialog from './Dialog.jsx';
import { FormError, primaryButtonClass, secondaryButtonClass } from './form.jsx';

/**
 * Asks before an action that is hard to undo. The confirm button says what will happen
 * ("Deactivate"), never just "OK".
 *
 * @param {{ open: boolean, title: string, children: any, confirmLabel: string,
 *           onConfirm: () => void, onClose: () => void, isBusy?: boolean, error?: string }} props
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  isBusy = false,
  error,
}) {
  return (
    <Dialog
      open={open}
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
            disabled={isBusy}
            onClick={onConfirm}
          >
            {isBusy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>{children}</div>
        <FormError message={error} />
      </div>
    </Dialog>
  );
}
