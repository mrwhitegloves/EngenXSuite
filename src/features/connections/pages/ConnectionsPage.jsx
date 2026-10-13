import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Mail } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';

const KEY = ['google-connection'];

// What Google's way back tells us (a short code in the address), in words.
const RESULTS = {
  connected: ['success', 'Connected. Your mail and calendar can now be used in the CRM.'],
  cancelled: ['muted', 'You cancelled on Google’s screen. Nothing was connected.'],
  not_allowed: ['danger', 'Only company accounts can connect Gmail and Calendar.'],
  wrong_domain: ['danger', 'Choose your company Google account, not a personal one.'],
  wrong_account: [
    'danger',
    'You can connect only your own mailbox: choose the account you sign in with.',
  ],
  permission_missing: [
    'danger',
    'Both permissions are needed. Connect again and tick mail and calendar on Google’s screen.',
  ],
  not_set_up: ['danger', 'Connecting Gmail and Calendar is not set up yet.'],
  failed: [
    'danger',
    'Connecting did not work. Try again; if it keeps failing, tell the person who runs the system.',
  ],
};
const TONES = {
  success: 'border-success text-success',
  danger: 'border-danger text-danger',
  muted: 'border-border',
};

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

// "Mail and calendar": a person connects their own company Gmail and Google Calendar.
// The lines under my mails. The mail screen offers "Add my signature".
function SignatureBox({ saved }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(saved ?? '');
  const save = useMutation({
    mutationFn: () =>
      apiRequest('/integrations/google/signature', { method: 'PATCH', body: { signature: text } }),
    onSuccess: (payload) => queryClient.setQueryData(KEY, payload),
  });
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">My mail signature</span>
        <textarea
          rows={4}
          maxLength={1000}
          value={text}
          placeholder={'Your name\nYour role, your phone number'}
          onChange={(event) => setText(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
        />
      </label>
      <button
        type="button"
        className={secondaryButtonClass}
        disabled={save.isPending || text === (saved ?? '')}
        onClick={() => save.mutate()}
      >
        {save.isPending ? 'Saving…' : 'Save the signature'}
      </button>
      <FormError message={save.error?.message} />
    </div>
  );
}

// Opened from My profile. Only company addresses can connect (the server decides).
export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(false);
  const result = RESULTS[searchParams.get('google')];
  const status = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => apiRequest('/integrations/google', { signal }),
    select: (payload) => payload.data,
  });
  const disconnect = useMutation({
    mutationFn: () => apiRequest('/integrations/google', { method: 'DELETE' }),
    onSuccess: (payload) => {
      queryClient.setQueryData(KEY, payload);
      setIsConfirming(false);
      setSearchParams({}, { replace: true });
    },
  });
  const data = status.data;
  const connection = data?.connection;
  // A full page load: the browser has to go to Google and come back.
  const connect = () => window.location.assign('/api/integrations/google/connect');

  return (
    <>
      <PageHeader
        title="Mail and calendar"
        description="Connect your own company Gmail and Google Calendar to the CRM."
      />
      <div className="max-w-2xl space-y-4">
        {result && (
          <p role="status" className={`rounded-md border p-3 text-sm ${TONES[result[0]]}`}>
            {result[1]}
          </p>
        )}
        <FormError message={status.error?.message} />
        {status.isPending && (
          <p role="status" className="text-text-muted">
            Loading…
          </p>
        )}

        {data && (
          <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Mail size={16} aria-hidden="true" />
              <CalendarDays size={16} aria-hidden="true" />
              Gmail and Google Calendar
            </h2>

            {!data.isConfigured && (
              <p className="text-text-muted">
                This is not set up yet. Missing on the server:{' '}
                <span className="font-mono text-xs">{data.missing.join(', ')}</span>
              </p>
            )}
            {data.isConfigured && !data.mayConnect && (
              <p className="text-text-muted">
                Only @{data.workspaceDomain} accounts can connect Gmail and Calendar. You can use
                everything else in the CRM as before.
              </p>
            )}

            {connection && (
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-text-muted">Mailbox</dt>
                <dd className="break-all">{connection.googleEmail}</dd>
                <dt className="text-text-muted">Status</dt>
                <dd className={connection.status === 'connected' ? 'text-success' : 'text-danger'}>
                  {connection.status === 'connected' ? 'Connected' : 'Needs to be connected again'}
                </dd>
                <dt className="text-text-muted">Since</dt>
                <dd>{formatMoment(connection.connectedAt)}</dd>
                <dt className="text-text-muted">Allowed</dt>
                <dd>
                  {[connection.hasMail && 'Mail', connection.hasCalendar && 'Calendar']
                    .filter(Boolean)
                    .join(' and ')}
                </dd>
              </dl>
            )}
            {connection?.lastError && <p className="text-sm text-danger">{connection.lastError}</p>}
            {connection && <SignatureBox key={connection.signature} saved={connection.signature} />}

            {data.isConfigured && data.mayConnect && (
              <>
                {!connection && (
                  <p className="text-sm text-text-muted">
                    Google will ask you to allow two things: reading and sending your mail, and your
                    calendar events. Choose your own @{data.workspaceDomain} account and tick both.
                    Mail of customers in the CRM is then shown with their company and lead; your
                    other mail is not stored.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(!connection || connection.status !== 'connected') && (
                    <button type="button" className={primaryButtonClass} onClick={connect}>
                      {connection ? 'Connect again' : 'Connect Gmail and Calendar'}
                    </button>
                  )}
                  {connection && (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => {
                        disconnect.reset();
                        setIsConfirming(true);
                      }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={isConfirming}
        title="Disconnect Gmail and Calendar?"
        confirmLabel="Disconnect"
        isBusy={disconnect.isPending}
        error={disconnect.error?.message}
        onClose={() => setIsConfirming(false)}
        onConfirm={() => disconnect.mutate()}
      >
        <p>
          The CRM stops reading and sending your mail and stops using your calendar. Google is told
          to take the permission back. You can connect again at any time.
        </p>
      </ConfirmDialog>
    </>
  );
}
