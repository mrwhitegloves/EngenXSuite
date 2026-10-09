import { useState } from 'react';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import {
  useDeleteJob,
  useFailedJobs,
  useJobsOverview,
  useRetryJob,
  useSendTestJob,
} from '../api.js';

const QUEUE_LABELS = {
  ai: 'AI',
  messaging: 'Messaging',
  integrations: 'Integrations',
  webhooks: 'Webhooks',
};

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown';

// The failed jobs of one queue, with Retry and Delete.
function FailedJobs({ queue, canEdit }) {
  const [page, setPage] = useState(1);
  const failed = useFailedJobs(queue, page);
  const retryJob = useRetryJob();
  const deleteJob = useDeleteJob();
  const busy = retryJob.isPending || deleteJob.isPending;

  const items = failed.data?.items ?? [];
  const total = failed.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (failed.data?.pageSize ?? 25)));

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Failed jobs: {QUEUE_LABELS[queue]}</h3>
      <FormError
        message={failed.error?.message || retryJob.error?.message || deleteJob.error?.message}
      />
      {failed.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {failed.isSuccess && items.length === 0 && (
        <p className="rounded-md border border-border bg-surface p-4 text-text-muted">
          No failed jobs in this queue.
        </p>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Job</th>
                <th className="px-3 py-2 font-medium">Why it failed</th>
                <th className="px-3 py-2 font-medium">Tries</th>
                <th className="px-3 py-2 font-medium">Failed at</th>
                {canEdit && <th className="px-3 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id} className="border-b border-border align-top last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{job.name}</div>
                    <div className="text-text-muted">Id {job.id}</div>
                  </td>
                  <td className="max-w-md px-3 py-2 break-words text-danger">
                    {job.failedReason || 'No reason recorded'}
                  </td>
                  <td className="px-3 py-2">{job.attemptsMade}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatTime(job.failedAt)}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busy}
                          onClick={() => retryJob.mutate({ queue, jobId: job.id })}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busy}
                          onClick={() => deleteJob.mutate({ queue, jobId: job.id })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-text-muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

// Settings → Background jobs: what the four queues hold, and the jobs that failed.
// Background jobs do slow work (AI, sending messages, syncing) outside the user's click.
export default function BackgroundJobs({ canEdit }) {
  const overview = useJobsOverview();
  const sendTestJob = useSendTestJob();
  const [selectedQueue, setSelectedQueue] = useState('integrations');

  const queues = overview.data?.queues ?? [];
  const redisIsUp = overview.data?.redis === 'up';

  return (
    <div className="space-y-5">
      <FormError message={overview.error?.message || sendTestJob.error?.message} />
      {overview.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}

      {overview.isSuccess && !redisIsUp && (
        <p role="alert" className="rounded-md border border-warning p-3 text-sm">
          Background jobs are not running right now, because Redis is{' '}
          {overview.data.redis === 'not_configured' ? 'not set up' : 'not reachable'}. The rest of
          the system keeps working.
        </p>
      )}

      {queues.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {queues.map((queue) => {
            const isSelected = queue.name === selectedQueue;
            return (
              <button
                key={queue.name}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedQueue(queue.name)}
                className={[
                  'rounded-md border p-3 text-left focus-visible:outline-2 focus-visible:outline-brand',
                  isSelected ? 'border-brand bg-brand-soft' : 'border-border bg-surface',
                ].join(' ')}
              >
                <div className="font-semibold">{QUEUE_LABELS[queue.name] ?? queue.name}</div>
                {queue.available ? (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt className="text-text-muted">Waiting</dt>
                    <dd>{queue.waiting + queue.delayed}</dd>
                    <dt className="text-text-muted">Running</dt>
                    <dd>{queue.active}</dd>
                    <dt className="text-text-muted">Failed</dt>
                    <dd className={queue.failed > 0 ? 'font-semibold text-danger' : ''}>
                      {queue.failed}
                    </dd>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">Not available</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {canEdit && redisIsUp && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={sendTestJob.isPending}
            onClick={() => sendTestJob.mutate({ shouldFail: false })}
          >
            Send a test job
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={sendTestJob.isPending}
            onClick={() => sendTestJob.mutate({ shouldFail: true })}
          >
            Send a test job that fails
          </button>
          {sendTestJob.isSuccess && (
            <span role="status" className="text-sm text-success">
              Test job added to Integrations. A failing one shows below after 3 tries (about 15
              seconds).
            </span>
          )}
        </div>
      )}

      {redisIsUp && <FailedJobs key={selectedQueue} queue={selectedQueue} canEdit={canEdit} />}
    </div>
  );
}
