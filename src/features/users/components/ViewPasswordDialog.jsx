import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Copy, Eye } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient.js';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';

const VISIBLE_SECONDS = 30;

// Shows one user's real password to the CEO or that user's manager (decision 0010).
// The password is requested only when the person presses "Show password" (one request, one audit
// entry), it is never kept in the query cache, and the window closes by itself after a short
// time so the password is not left on screen.
// The parent renders this with key={user.id}, so every opening starts fresh.
export default function ViewPasswordDialog({ user, onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(VISIBLE_SECONDS);
  const [copied, setCopied] = useState(false);

  // A mutation, not a query: it must run exactly once per click and never refetch by itself.
  const reveal = useMutation({
    mutationFn: () => apiRequest(`/users/${user.id}/password`),
    gcTime: 0,
  });
  const result = reveal.data?.data;
  const isShowing = Boolean(result?.available);

  // Count down only while a password is actually on screen.
  useEffect(() => {
    if (!isShowing) return undefined;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [isShowing]);

  const timeIsUp = secondsLeft <= 0;
  useEffect(() => {
    if (timeIsUp) onClose();
  }, [timeIsUp, onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the password is visible and can be selected by hand.
    }
  }

  return (
    <Dialog
      open
      title={`Password: ${user.name}`}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Close
        </button>
      }
    >
      <p className="mb-3 text-text-muted">{user.email}</p>
      <FormError message={reveal.error?.message} />

      {!reveal.isSuccess && (
        <>
          <p className="mb-3">
            Showing this password is recorded in the audit log with your name and the time.
          </p>
          <button
            type="button"
            onClick={() => reveal.mutate()}
            disabled={reveal.isPending}
            className={primaryButtonClass}
          >
            <Eye size={16} aria-hidden="true" />
            {reveal.isPending ? 'Loading…' : 'Show password'}
          </button>
        </>
      )}

      {reveal.isSuccess && !result.available && (
        <p>
          This password was set before passwords could be shown. Reset it, or wait until the user
          changes it; after that it appears here.
        </p>
      )}

      {isShowing && (
        <>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-md border border-border bg-page px-3 py-2 font-mono text-base">
              {result.password}
            </code>
            <button
              type="button"
              onClick={copy}
              title="Copy password"
              aria-label="Copy password"
              className="rounded-md border border-border p-2 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
            >
              {copied ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-3 text-sm text-text-muted">Hidden again in {secondsLeft} seconds.</p>
        </>
      )}
    </Dialog>
  );
}
