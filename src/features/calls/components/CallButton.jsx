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
import { useBrowserPhone } from '../browserPhone/BrowserPhoneProvider.jsx';

const iconButtonClass =
  'rounded p-1.5 text-text-muted hover:bg-page hover:text-success focus-visible:outline-2 focus-visible:outline-brand';
const buttonClass =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

/**
 * THE way to phone a contact from the CRM. It asks first. When calls in the browser are ready
 * (founder decision 2026-10-16: the default), the call runs inside the CRM: the contact is
 * dialled at once and the talk is through the computer. Otherwise, or on request, the user's
 * own phone rings first; when they pick up, the contact is dialled. Either way the contact sees
 * the company's number. Shows nothing for someone who may not make calls.
 *
 * @param {{ contact: { id: string, name: string }, opportunityId?: string, iconOnly?: boolean }} props
 *        opportunityId: the lead the call is about, when it is started from a lead.
 *        iconOnly: a round phone icon without the word (the header of a WhatsApp chat).
 */
export default function CallButton({ contact, opportunityId, iconOnly = false }) {
  const can = useCan();
  const [isOpen, setIsOpen] = useState(false);
  const start = useStartCall();
  const phone = useBrowserPhone();
  const [browserError, setBrowserError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  if (!can('calls', 'create')) return null;
  const inBrowser = phone.isReady && !(phone.call && phone.call.state !== 'ended');
  const startInBrowser = async () => {
    setBrowserError(null);
    setIsStarting(true);
    try {
      await phone.startCall({ contact, opportunityId });
      setIsOpen(false);
    } catch (error) {
      setBrowserError(error?.message ?? 'The call could not start.');
    } finally {
      setIsStarting(false);
    }
  };
  const ringMyPhone = () =>
    start.mutate({
      contactId: contact.id,
      ...(opportunityId ? { opportunityId } : {}),
    });

  const close = () => setIsOpen(false);
  return (
    <>
      <button
        type="button"
        className={iconOnly ? iconButtonClass : buttonClass}
        aria-label={`Call ${contact.name}`}
        title={iconOnly ? `Call ${contact.name}` : undefined}
        onClick={() => {
          start.reset();
          setIsOpen(true);
        }}
      >
        <PhoneCall size={iconOnly ? 20 : 14} aria-hidden="true" />
        {!iconOnly && 'Call'}
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
          ) : inBrowser ? (
            <>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={start.isPending || isStarting}
                onClick={ringMyPhone}
              >
                {start.isPending ? 'Starting…' : 'Ring my phone instead'}
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={isStarting || start.isPending}
                onClick={startInBrowser}
              >
                {isStarting ? 'Starting…' : 'Call now'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={secondaryButtonClass} onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={start.isPending}
                onClick={ringMyPhone}
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
          ) : inBrowser ? (
            <p>
              The call runs here in the CRM: {contact.name} is called at once and sees the company’s
              number. You talk through your computer’s microphone and speaker (a headset is best).
            </p>
          ) : (
            <>
              <p>
                Your own phone rings first. When you pick up, {contact.name} is called and sees the
                company’s number, not yours.
              </p>
              {phone.status === 'otherTab' && (
                <p className="text-sm text-text-muted">
                  Calls in the CRM run in your other CRM tab. Use that tab to call from the
                  computer.
                </p>
              )}
              {phone.status === 'error' && phone.problem && (
                <p className="text-sm text-text-muted">{phone.problem}</p>
              )}
            </>
          )}
          <FormError message={browserError ?? start.error?.message} />
        </div>
      </Dialog>
    </>
  );
}
