import { useState } from 'react';
import { Pencil, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useMeeting, useMeetingActions } from '../api.js';
import { MODE_LABELS, STATUS_LABELS, formatMoment, formatTime } from '../dates.js';
import MeetingDialog from './MeetingDialog.jsx';

const RESPONSE_LABELS = {
  needsAction: 'no answer yet',
  accepted: 'comes',
  declined: 'does not come',
  tentative: 'maybe',
};

function Row({ label, children }) {
  return (
    <div className="grid gap-x-3 sm:grid-cols-[8rem_1fr]">
      <dt className="text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * One meeting: when, where, who, and what was said. The organizer (or their manager) changes
 * it, closes it with notes, or cancels it.
 * @param {{ meetingId: string, onClose: () => void }} props
 */
export default function MeetingDetail({ meetingId, onClose }) {
  const meeting = useMeeting(meetingId);
  const { close, update } = useMeetingActions();
  const [isEditing, setIsEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  // The notes box: undefined until the person types, then their text.
  const [typed, setTyped] = useState();
  const data = meeting.data;

  if (isEditing && data)
    return <MeetingDialog meeting={data} onClose={() => setIsEditing(false)} />;

  const notes = typed ?? data?.notes ?? '';
  const isPlanned = data?.status === 'scheduled';
  const canEdit = data?.permissions.canEdit;
  const closeAs = (status) =>
    close.mutate(
      { id: data.id, status, ...(notes.trim() ? { notes: notes.trim() } : {}) },
      { onSuccess: () => setTyped(undefined) },
    );

  return (
    <>
      <Dialog open wide title={data?.title ?? 'Meeting'} onClose={onClose}>
        {meeting.isPending && (
          <p role="status" className="text-text-muted">
            Loading…
          </p>
        )}
        <FormError
          message={
            meeting.error?.status === 404
              ? 'This meeting does not exist, or it is not one of yours.'
              : meeting.error?.message
          }
        />
        {data && (
          <div className="space-y-4 text-sm">
            <dl className="space-y-1.5">
              <Row label="When">
                {formatMoment(data.startAt)} – {formatTime(data.endAt)}
                <span
                  className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${isPlanned ? 'border-brand text-brand-text' : 'border-border text-text-muted'}`}
                >
                  {STATUS_LABELS[data.status]}
                </span>
              </Row>
              <Row label="Kind">{MODE_LABELS[data.mode]}</Row>
              {data.location && <Row label="Where">{data.location}</Row>}
              {data.meetLink && (
                <Row label="Link">
                  <a
                    href={data.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-text hover:underline"
                  >
                    <Video size={14} aria-hidden="true" />
                    Join with Google Meet
                  </a>
                  <button
                    type="button"
                    className="ml-3 text-xs text-text-muted hover:text-text hover:underline"
                    onClick={() => {
                      navigator.clipboard?.writeText(data.meetLink);
                      setIsCopied(true);
                    }}
                  >
                    {isCopied ? 'Copied' : 'Copy the link'}
                  </button>
                  <span className="block text-xs break-all text-text-muted">{data.meetLink}</span>
                </Row>
              )}
              {(data.account || data.lead) && (
                <Row label="About">
                  {data.lead && (
                    <Link
                      to={`/pipeline/${data.lead.id}`}
                      className="hover:text-brand-text hover:underline"
                    >
                      {data.lead.name}
                    </Link>
                  )}
                  {data.lead && data.account && ' · '}
                  {data.account && (
                    <Link
                      to={`/accounts/${data.account.id}`}
                      className="hover:text-brand-text hover:underline"
                    >
                      {data.account.name}
                    </Link>
                  )}
                </Row>
              )}
              <Row label="Organizer">{data.organizer?.name ?? 'Unknown'}</Row>
              {data.colleagues.length > 0 && (
                <Row label="Colleagues">
                  {data.colleagues.map((person) => person.name).join(', ')}
                </Row>
              )}
              {data.attendees.length > 0 && (
                <Row label="Guests">
                  {data.attendees.map((person) => (
                    <span key={person.contactId ?? person.email} className="block">
                      {person.name ?? person.email}
                      {person.name && person.email && !person.contactId && (
                        <span className="text-text-muted"> {person.email}</span>
                      )}
                      {person.email && data.isInGoogleCalendar && (
                        <span className="text-text-muted">
                          {' '}
                          ({RESPONSE_LABELS[person.response]})
                        </span>
                      )}
                    </span>
                  ))}
                </Row>
              )}
              {data.agenda && (
                <Row label="About what">
                  <span className="whitespace-pre-line">{data.agenda}</span>
                </Row>
              )}
              <Row label="Google Calendar">
                {data.googleSyncError ? (
                  <span className="text-danger">
                    The last change did not reach Google Calendar: {data.googleSyncError}
                  </span>
                ) : data.isInGoogleCalendar ? (
                  `In ${data.organizer?.name ?? 'the organizer'}’s calendar${data.bookedVia === 'google' ? ' (made there)' : ''}`
                ) : (
                  'Only in the CRM'
                )}
              </Row>
            </dl>

            {canEdit ? (
              <label className="block">
                <span className="mb-1 block font-medium">
                  {isPlanned ? 'Notes: what was said and decided' : 'Notes'}
                </span>
                <textarea
                  rows={5}
                  maxLength={20000}
                  value={notes}
                  placeholder="Write them when the meeting is over."
                  onChange={(event) => setTyped(event.target.value)}
                  className={inputClass}
                />
              </label>
            ) : (
              data.notes && (
                <div>
                  <p className="mb-1 font-medium">Notes</p>
                  <p className="break-words whitespace-pre-line">{data.notes}</p>
                </div>
              )
            )}
            <FormError message={close.error?.message ?? update.error?.message} />

            {canEdit && (
              <div className="flex flex-wrap justify-end gap-2">
                {isPlanned ? (
                  <>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => setIsCancelling(true)}
                    >
                      Cancel the meeting
                    </button>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Change or move
                    </button>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={close.isPending}
                      onClick={() => closeAs('no_show')}
                    >
                      Customer did not come
                    </button>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={close.isPending}
                      onClick={() => closeAs('completed')}
                    >
                      {close.isPending ? 'Saving…' : 'It was held'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={update.isPending || typed === undefined}
                    onClick={() =>
                      update.mutate(
                        { id: data.id, notes: notes.trim() },
                        { onSuccess: () => setTyped(undefined) },
                      )
                    }
                  >
                    {update.isPending ? 'Saving…' : 'Save the notes'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={isCancelling}
        title="Cancel this meeting?"
        confirmLabel="Cancel the meeting"
        isBusy={close.isPending}
        error={close.error?.message}
        onClose={() => setIsCancelling(false)}
        onConfirm={() =>
          close.mutate(
            { id: data.id, status: 'cancelled', ...(notes.trim() ? { notes: notes.trim() } : {}) },
            { onSuccess: () => setIsCancelling(false) },
          )
        }
      >
        <p>
          <strong>{data?.title}</strong> will be marked as cancelled.
          {data?.isInGoogleCalendar &&
            ' It leaves Google Calendar, and Google tells the guests that it is cancelled.'}
        </p>
      </ConfirmDialog>
    </>
  );
}
