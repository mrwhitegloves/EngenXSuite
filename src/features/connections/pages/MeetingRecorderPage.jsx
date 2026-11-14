import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, Mic } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';

const KEY = ['recorder-devices'];

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

/** "ABCD2345" is shown as "ABCD-2345", easier to read and type. */
const spaced = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

function useCountdown(until) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, new Date(until).getTime() - now);
  return `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
}

// "Meeting recorder": connect the Chrome extension on my laptop to my user with a one-time
// code, and see or disconnect my connected laptops. Opened from My profile.
export default function MeetingRecorderPage() {
  const queryClient = useQueryClient();
  const [pairing, setPairing] = useState(null); // { code, expiresAt }
  const [toDisconnect, setToDisconnect] = useState(null);
  const devices = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => apiRequest('/recorder/devices', { signal }),
    select: (payload) => payload.data,
    // While a code is shown, the new laptop appears here as soon as it is connected.
    refetchInterval: pairing ? 3000 : false,
  });
  const makeCode = useMutation({
    mutationFn: () => apiRequest('/recorder/pairing-codes', { method: 'POST' }),
    onSuccess: (payload) => setPairing({ ...payload.data, countAtCode: devices.data?.length ?? 0 }),
  });
  const disconnect = useMutation({
    mutationFn: (id) => apiRequest(`/recorder/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setToDisconnect(null);
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
  const left = useCountdown(pairing?.expiresAt);
  const expired = left === '0:00';
  const count = devices.data?.length ?? 0;

  // The code was used: the list of laptops grew since it was made.
  const isUsed = Boolean(pairing) && count > pairing.countAtCode;
  const showCode = Boolean(pairing) && !expired && !isUsed;

  return (
    <>
      <PageHeader
        title="Meeting recorder"
        description="The Chrome extension that writes down your Google Meet calls, live, on the meeting’s company and lead."
      />
      <div className="max-w-2xl space-y-4">
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mic size={16} aria-hidden="true" />
            Connect a laptop
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              Install the Meeting recorder extension in Chrome (ask the person who runs the system).
            </li>
            <li>In Chrome, press the recorder’s icon and then “Connect to the CRM”.</li>
            <li>Press “Make a code” here and type the code on the recorder’s page.</li>
          </ol>
          {isUsed && (
            <p role="status" className="rounded-md border border-success p-3 text-sm text-success">
              Connected. The recorder on that laptop now records for you.
            </p>
          )}
          {showCode ? (
            <div role="status" className="rounded-md border border-brand p-3">
              <p className="text-sm text-text-muted">Type this code into the recorder:</p>
              <p className="font-mono text-3xl font-semibold tracking-widest">
                {spaced(pairing.code)}
              </p>
              <p className="text-xs text-text-muted">
                Works once, for {left} more. Never send it to anyone.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={makeCode.isPending}
              onClick={() => makeCode.mutate()}
            >
              {expired && !isUsed ? 'Make a new code' : 'Make a code'}
            </button>
          )}
          <FormError message={makeCode.error?.message} />
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Laptop size={16} aria-hidden="true" />
            My connected laptops
          </h2>
          <FormError message={devices.error?.message ?? disconnect.error?.message} />
          {devices.isSuccess && count === 0 && <p className="text-sm text-text-muted">None yet.</p>}
          <ul className="space-y-2">
            {(devices.data ?? []).map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-b-0"
              >
                <span>
                  <span className="font-medium">{device.name}</span>
                  <span className="block text-xs text-text-muted">
                    Connected {formatMoment(device.connectedAt)}
                    {device.lastUsedAt ? ` · last used ${formatMoment(device.lastUsedAt)}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setToDisconnect(device)}
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted">
            A laptop that is lost or given to someone else: disconnect it here. Its recorder stops
            working at once.
          </p>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(toDisconnect)}
        title="Disconnect this laptop?"
        confirmLabel="Disconnect"
        isBusy={disconnect.isPending}
        error={disconnect.error?.message}
        onClose={() => setToDisconnect(null)}
        onConfirm={() => disconnect.mutate(toDisconnect.id)}
      >
        <p>
          The recorder on “{toDisconnect?.name}” stops at once. To use it again, connect it with a
          new code.
        </p>
      </ConfirmDialog>
    </>
  );
}
