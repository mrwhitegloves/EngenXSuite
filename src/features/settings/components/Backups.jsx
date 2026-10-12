import { useState } from 'react';
import { DatabaseBackup } from 'lucide-react';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  compactInputClass,
  fieldErrorsFrom,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useBackups, useSaveBackupCleanup, useStartBackup } from '../api.js';

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

/** "02:30" → "2:30 am". */
function formatClock(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}

// When old backups are deleted, and how long before that the person is told. Rendered with a
// key, so saved values start it afresh.
function CleanupForm({ cleanup, canEdit, save }) {
  const [deleteTime, setDeleteTime] = useState(cleanup.deleteTime);
  const [minutes, setMinutes] = useState(String(cleanup.notifyMinutesBefore));
  const isChanged =
    deleteTime !== cleanup.deleteTime || minutes !== String(cleanup.notifyMinutesBefore);
  const errors = fieldErrorsFrom(save.error);

  return (
    <form
      className="space-y-3 rounded-md border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ deleteTime, notifyMinutesBefore: Number(minutes) });
      }}
    >
      <div>
        <h2 className="font-semibold">Deleting old backups</h2>
        <p className="text-sm text-text-muted">
          Backups older than {cleanup.keepDays} days are deleted once a day, at the time below
          (India time). The newest 7 always stay. You get a notification.
        </p>
      </div>
      <fieldset disabled={!canEdit} className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Delete old backups at</span>
          <input
            type="time"
            required
            value={deleteTime}
            onChange={(event) => setDeleteTime(event.target.value)}
            className={compactInputClass}
          />
          {errors.deleteTime && (
            <span className="block text-sm text-danger">{errors.deleteTime}</span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tell me this many minutes before</span>
          <input
            type="number"
            required
            min={0}
            max={720}
            step={1}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className={`${compactInputClass} w-28`}
          />
          {errors.notifyMinutesBefore && (
            <span className="block text-sm text-danger">{errors.notifyMinutesBefore}</span>
          )}
        </label>
      </fieldset>
      <p className="text-sm text-text-muted">
        {Number(minutes) > 0
          ? `You are told ${minutes} minutes before ${formatClock(deleteTime || cleanup.deleteTime)}, so there is time to look.`
          : `0 minutes: you are told at ${formatClock(deleteTime || cleanup.deleteTime)}, when they are deleted.`}
      </p>
      <FormError message={save.error?.message} />
      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!isChanged || save.isPending || minutes === ''}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          {isChanged && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setDeleteTime(cleanup.deleteTime);
                setMinutes(String(cleanup.notifyMinutesBefore));
                save.reset();
              }}
            >
              Reset
            </button>
          )}
          {save.isSuccess && !isChanged && (
            <span role="status" className="text-sm text-success">
              Saved.
            </span>
          )}
        </div>
      )}
    </form>
  );
}

// Settings → Backups: the copies of the whole database kept in private storage.
// A backup is made every night at 02:00 India time on the live server. Restoring one is done
// from the command line, on purpose: it is rare and must never happen by a wrong click.
export default function Backups({ canEdit }) {
  const backups = useBackups();
  const startBackup = useStartBackup();
  // Kept here, not in the form: the form starts afresh after a save, and "Saved" must stay.
  const saveCleanup = useSaveBackupCleanup();
  const cleanup = backups.data?.cleanup;

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
                : 'Made every night at 2:00 am India time, and whenever you press “Back up now”.'}
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

      {cleanup && (
        <CleanupForm
          key={JSON.stringify(cleanup)}
          cleanup={cleanup}
          canEdit={canEdit}
          save={saveCleanup}
        />
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
