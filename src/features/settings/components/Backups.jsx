import { DatabaseBackup } from 'lucide-react';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useBackups, useStartBackup } from '../api.js';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Settings → Backups: the copies of the whole database kept in private storage.
// A backup is made every night at 02:00 India time on the live server. Restoring one is done
// from the command line, on purpose: it is rare and must never happen by a wrong click.
export default function Backups({ canEdit }) {
  const backups = useBackups();
  const startBackup = useStartBackup();

  const list = backups.data?.backups ?? [];
  const storageReady = backups.data?.storage === 'configured';
  const newest = list[0];
  // Worked out by the server: the newest backup is more than two days old.
  const isStale = Boolean(backups.data?.isStale);

  return (
    <div className="space-y-4">
      <FormError message={backups.error?.message ?? startBackup.error?.message} />
      {backups.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}

      {backups.isSuccess && !storageReady && (
        <p role="alert" className="rounded-md border border-warning p-3 text-sm">
          Backups are off, because file storage is not set up. The database has no other backup.
        </p>
      )}

      {storageReady && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-4">
          <div>
            <p className="font-semibold">
              {newest ? `Last backup: ${formatDate(newest.createdAt)}` : 'No backup yet'}
            </p>
            <p className={`text-sm ${isStale ? 'text-danger' : 'text-text-muted'}`}>
              {isStale
                ? 'The last backup is more than 2 days old. Check Background jobs for a failure.'
                : 'Made every night at 2:00 am. Kept for 14 days, and never fewer than the last 7.'}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={startBackup.isPending}
              onClick={() => startBackup.mutate()}
            >
              {startBackup.isPending ? 'Starting…' : 'Back up now'}
            </button>
          )}
        </div>
      )}

      {startBackup.isSuccess && (
        <p role="status" className="text-sm text-success">
          Backup started. It appears in the list below when it is finished.
        </p>
      )}

      {storageReady && list.length === 0 && (
        <EmptyState
          icon={DatabaseBackup}
          title="No backups yet"
          description="The first one is made tonight, or use “Back up now”."
        />
      )}

      {list.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Made at</th>
                <th className="px-4 py-2 font-medium">Records</th>
                <th className="px-4 py-2 font-medium">Collections</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2 font-medium">Backup id</th>
              </tr>
            </thead>
            <tbody>
              {list.map((backup) => (
                <tr key={backup.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(backup.createdAt)}</td>
                  <td className="px-4 py-2">{backup.documents.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2">{backup.collections}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatSize(backup.bytes)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-muted">{backup.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-text-muted">
        A backup holds everything in the database. To restore one, a developer uses the backup id
        with the restore command; it always goes into a new, empty database first.
      </p>
    </div>
  );
}
