import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useStartCall } from '../api.js';

const buttonClass =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

/**
 * THE way to phone a contact from the CRM. It asks first, then rings the user's own phone;
 * when they pick up, the contact is dialled and sees the company's number.
 * Shows nothing for someone who may not make calls.
 *
 * @param {{ contact: { id: string, name: string }, opportunityId?: string }} props
 *        opportunityId: the lead the call is about, when it is started from a lead.
 */
export default function CallButton({ contact, opportunityId }) {
  const can = useCan();
  const [isOpen, setIsOpen] = useState(false);
  const start = useStartCall();
  if (!can('calls', 'create')) return null;

  const close = () => setIsOpen(false);
  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-label={`Call ${contact.name}`}
        onClick={() => {
          start.reset();
          setIsOpen(true);
        }}
      >
        <PhoneCall size={14} aria-hidden="true" />
        Call
      </button>
      <Dialog
        open={isOpen}
        title={`Call ${contact.name}?`}
        onClose={close}
        footer={
          start.isSuccess ? (
            <button type="button" className={primaryButtonClass} onClick={close}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className={secondaryButtonClass} onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={start.isPending}
                onClick={() =>
                  start.mutate({
                    contactId: contact.id,
                    ...(opportunityId ? { opportunityId } : {}),
                  })
                }
              >
                {start.isPending ? 'Starting…' : 'Call now'}
              </button>
            </>
          )
        }
      >
        <div className="space-y-3">
          {start.isSuccess ? (
            <p role="status">
              Your phone is ringing. Pick it up and you are joined to {contact.name}. The call shows
              on the timeline when it ends.
            </p>
          ) : (
            <p>
              Your own phone rings first. When you pick up, {contact.name} is called and sees the
              company’s number, not yours.
            </p>
          )}
          <FormError message={start.error?.message} />
        </div>
      </Dialog>
    </>
  );
}
