import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import { TagChips } from '../../../components/shared/Tags.jsx';
import {
  Field,
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  compactInputClass,
} from '../../../components/shared/form.jsx';
import { useChangeStage, useDeleteLead } from '../api.js';
import { rupees } from '../leadForm.js';
import LeadEditModal from './LeadEditModal.jsx';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDay = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(
        new Date(value),
      )
    : '—';

/** "today", "1 day", "12 days": how long the lead has been in its stage. */
function daysInStage(enteredAt, now) {
  const days = Math.floor((now - new Date(enteredAt)) / DAY_MS);
  if (days <= 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

// Won and lost need a reason before the stage is changed.
function CloseDialog({ lead, stage, move, onClose }) {
  const [closeReason, setCloseReason] = useState('');
  const [lostToCompetitor, setLostToCompetitor] = useState('');
  const isWon = stage.type === 'won';
  return (
    <Dialog open title={`Mark “${lead.name}” as ${stage.name}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          move.mutate(
            {
              id: lead.id,
              stageId: stage.id,
              closeReason: closeReason.trim(),
              ...(lostToCompetitor.trim() ? { lostToCompetitor: lostToCompetitor.trim() } : {}),
              via: 'pipeline',
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label={isWon ? 'Why was it won?' : 'Why was it lost?'}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              maxLength={500}
              autoFocus
              value={closeReason}
              onChange={(event) => setCloseReason(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        {!isWon && (
          <Field label="Lost to (competitor)" hint="Leave empty when not known.">
            {(props) => (
              <input
                {...props}
                value={lostToCompetitor}
                maxLength={200}
                onChange={(event) => setLostToCompetitor(event.target.value)}
                className={inputClass}
              />
            )}
          </Field>
        )}
        <FormError message={move.error?.message} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!closeReason.trim() || move.isPending}
          >
            {move.isPending ? 'Saving…' : `Mark as ${stage.name}`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Leads as a table: used by the Pipeline page and by the Leads tab of a company.
 * The stage is changed right in the row; everything else through the one lead form.
 *
 * @param {{ rows: object[], stages: object[], caption: string, sort?: string,
 *           onSortChange?: (sort: string) => void, isRefreshing?: boolean,
 *           showAccount?: boolean }} props
 *        stages: from the lead form options (id, name, type, isActive)
 */
export default function LeadsTable({
  rows,
  stages,
  caption,
  sort,
  onSortChange,
  isRefreshing,
  showAccount = true,
}) {
  const move = useChangeStage();
  const deleteLead = useDeleteLead();
  const [editId, setEditId] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Read once per render of the table; "days in stage" does not need to tick.
  const [now] = useState(() => Date.now());

  function changeStage(lead, stageId) {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage || stageId === lead.stage?.id) return;
    move.reset();
    if (stage.type === 'open') move.mutate({ id: lead.id, stageId, via: 'pipeline' });
    else setCloseTarget({ lead, stage });
  }

  const columns = [
    {
      key: 'leadCode',
      header: 'Code',
      sortKey: 'leadCode',
      className: 'font-mono text-xs whitespace-nowrap text-text-muted',
      render: (row) => row.leadCode,
    },
    {
      key: 'name',
      header: 'Lead',
      sortKey: 'name',
      render: (row) => (
        <>
          <p className="font-medium">{row.name}</p>
          {showAccount && row.account && (
            <Link
              to={`/accounts/${row.account.id}`}
              className="text-text-muted hover:text-brand-text hover:underline"
            >
              {row.account.name}
            </Link>
          )}
          {row.primaryContact && (
            <p className="text-text-muted">
              {row.primaryContact.name}
              {row.primaryContact.phone_number && <> · {row.primaryContact.phone_number}</>}
            </p>
          )}
          <TagChips tags={row.tags} className="mt-1" />
        </>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      sortKey: 'stageEnteredAt',
      render: (row) => (
        <>
          {row.permissions.canEdit ? (
            <select
              aria-label={`Stage of ${row.name}`}
              value={row.stage?.id ?? ''}
              disabled={move.isPending}
              onChange={(event) => changeStage(row, event.target.value)}
              className={`${compactInputClass} min-w-36 py-1 text-sm`}
            >
              {stages
                .filter((stage) => stage.isActive || stage.id === row.stage?.id)
                .map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
            </select>
          ) : (
            <span>{row.stage?.name ?? '—'}</span>
          )}
          <p className="mt-0.5 text-xs text-text-muted">
            {row.leadStatus?.name ?? '—'} · {daysInStage(row.stageEnteredAt, now)}
          </p>
        </>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      sortKey: 'estimatedValuePaise',
      className: 'whitespace-nowrap',
      render: (row) => (
        <>
          {rupees(row.estimatedValuePaise)}
          {row.probability !== null && (
            <p className="text-xs text-text-muted">{row.probability}% chance</p>
          )}
        </>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (row) => row.owner?.name ?? <span className="text-warning">Unassigned</span>,
    },
    {
      key: 'next',
      header: 'Next action',
      render: (row) =>
        row.nextAction?.text ? (
          <>
            {row.nextAction.text}
            {row.nextAction.dueAt && (
              <p className="text-xs text-text-muted">by {formatDay(row.nextAction.dueAt)}</p>
            )}
          </>
        ) : (
          '—'
        ),
    },
    {
      key: 'expectedCloseDate',
      header: 'Close by',
      sortKey: 'expectedCloseDate',
      className: 'whitespace-nowrap text-text-muted',
      render: (row) => formatDay(row.expectedCloseDate),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.permissions.canEdit && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Edit ${row.name}`}
              onClick={() => setEditId(row.id)}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          )}
          {row.permissions.canDelete && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Delete ${row.name}`}
              onClick={() => {
                deleteLead.reset();
                setDeleteTarget(row);
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <FormError message={closeTarget ? null : move.error?.message} />
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows}
        sort={sort}
        onSortChange={onSortChange}
        isRefreshing={isRefreshing}
      />

      {editId && <LeadEditModal key={editId} leadId={editId} onClose={() => setEditId(null)} />}
      {closeTarget && (
        <CloseDialog
          key={`${closeTarget.lead.id}-${closeTarget.stage.id}`}
          lead={closeTarget.lead}
          stage={closeTarget.stage}
          move={move}
          onClose={() => setCloseTarget(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this lead?"
        confirmLabel="Delete"
        isBusy={deleteLead.isPending}
        error={deleteLead.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteLead.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> ({deleteTarget?.leadCode}) will disappear from every
          screen. Its history is kept, and its code is not used again.
        </p>
      </ConfirmDialog>
    </>
  );
}
