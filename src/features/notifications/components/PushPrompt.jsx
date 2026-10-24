import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, X } from 'lucide-react';
import { enablePush, getPushState } from '../../../lib/push.js';

const KEY = ['push-state'];
const DISMISSED_KEY = 'notifications.promptDismissedAt';
const ASK_AGAIN_MS = 7 * 24 * 60 * 60 * 1000;

function wasDismissedLately() {
  try {
    return Date.now() - Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0) < ASK_AGAIN_MS;
  } catch {
    return false;
  }
}

/**
 * A strip above the page that offers the computer's own notifications (new WhatsApp messages,
 * tasks …, also when the CRM is in the background or closed) until they are on in this
 * browser. "Not now" hides it for a week. The same switch is on the Notifications page.
 */
export default function PushPrompt() {
  const queryClient = useQueryClient();
  const [isHidden, setIsHidden] = useState(wasDismissedLately);
  const state = useQuery({ queryKey: KEY, queryFn: getPushState, enabled: !isHidden });
  const turnOn = useMutation({
    mutationFn: enablePush,
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  if (isHidden || state.data !== 'off') return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Without storage it is asked again next time; nothing else changes.
    }
    setIsHidden(true);
  };

  return (
    <div
      role="region"
      aria-label="Notifications on this computer"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-info bg-surface p-3 text-sm"
    >
      <BellRing size={18} aria-hidden="true" className="shrink-0 text-info" />
      <p className="min-w-0 flex-1">
        Turn on notifications on this computer, so new WhatsApp messages, calls and tasks show even
        when the CRM is in the background.
        {turnOn.error && <span className="block text-danger">{turnOn.error.message}</span>}
      </p>
      <button
        type="button"
        disabled={turnOn.isPending}
        onClick={() => turnOn.mutate()}
        className="rounded-md bg-info px-3 py-1.5 font-medium text-surface hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {turnOn.isPending ? 'One moment…' : 'Turn on'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
