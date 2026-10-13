import { useMutation, useQuery } from '@tanstack/react-query';
import { MailX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { FormError, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useBranding } from '../../../hooks/useBranding.js';
import { apiRequest } from '../../../lib/apiClient.js';

// The page behind the link at the foot of a bulk mail: the reader stops such mails to their
// own address with one press. No sign-in; the link works only for the address it was sent to.
export default function StopMailPage() {
  const { token } = useParams();
  const { companyName } = useBranding();
  const page = useQuery({
    queryKey: ['public-stop-mail', token],
    queryFn: ({ signal }) => apiRequest(`/public/stop-mail/${token}`, { signal }),
    select: (payload) => payload.data,
    retry: false,
  });
  const stop = useMutation({
    mutationFn: () => apiRequest(`/public/stop-mail/${token}`, { method: 'POST' }),
  });
  const isStopped = stop.isSuccess || page.data?.isStopped;

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-page px-4 py-10 text-text">
      {page.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {page.isError && (
        <p role="alert" className="rounded-lg border border-border bg-surface p-6">
          {[400, 404].includes(page.error.status)
            ? 'This link is not valid. Please use the link exactly as it is in the mail.'
            : page.error.message}
        </p>
      )}
      {page.data && (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <MailX size={22} aria-hidden="true" className="text-brand-text" />
            {isStopped ? 'Done' : 'Stop these mails'}
          </h1>
          {isStopped ? (
            <p role="status">
              <span className="font-medium break-all">{page.data.email}</span> will get no more
              mails of this kind from {companyName}. A personal answer to something you asked us can
              still reach you.
            </p>
          ) : (
            <>
              <p>
                Mails that {companyName} sends to many people at once will no longer go to{' '}
                <span className="font-medium break-all">{page.data.email}</span>.
              </p>
              <FormError message={stop.error?.message} />
              <button
                type="button"
                className={primaryButtonClass}
                disabled={stop.isPending}
                onClick={() => stop.mutate()}
              >
                {stop.isPending ? 'One moment…' : 'Stop these mails'}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
