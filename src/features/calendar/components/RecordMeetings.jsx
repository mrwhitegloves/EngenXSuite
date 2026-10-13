import { useState } from 'react';
import { Plus } from 'lucide-react';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useMeetings } from '../api.js';
import { MODE_LABELS, STATUS_LABELS, formatMoment } from '../dates.js';
import MeetingDetail from './MeetingDetail.jsx';
import MeetingDialog from './MeetingDialog.jsx';

/**
 * The meetings of one lead or one company, with "Plan a meeting". Used on those pages.
 * @param {{ target: { opportunityId?: string, accountId?: string } }} props
 *        For a lead, give its company too (accountId), so its people can be invited.
 */
export default function RecordMeetings({ target }) {
  const can = useCan();
  const [isAdding, setIsAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const list = target.opportunityId
    ? { opportunityId: target.opportunityId }
    : { accountId: target.accountId };
  const meetings = useMeetings(list);
  const rows = meetings.data ?? [];

  return (
    <section aria-label="Meetings" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Meetings</h2>
        {can('meetings', 'create') && (
          <button type="button" className={secondaryButtonClass} onClick={() => setIsAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            Plan a meeting
          </button>
        )}
      </div>
      <FormError message={meetings.error?.message} />
      {meetings.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          No meetings here yet.
        </p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((meeting) => (
            <li key={meeting.id}>
              <button
                type="button"
                onClick={() => setOpenId(meeting.id)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span
                  className={`block font-medium break-words ${meeting.status === 'cancelled' ? 'text-text-muted line-through' : ''}`}
                >
                  {meeting.title}
                </span>
                <span className="block text-xs text-text-muted">
                  {formatMoment(meeting.startAt)} · {MODE_LABELS[meeting.mode]} ·{' '}
                  {STATUS_LABELS[meeting.status]}
                  {meeting.organizer && <> · {meeting.organizer.name}</>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {isAdding && <MeetingDialog target={target} onClose={() => setIsAdding(false)} />}
      {openId && <MeetingDetail meetingId={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
}
