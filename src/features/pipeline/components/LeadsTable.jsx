import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import { TagChips } from '../../../components/shared/Tags.jsx';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useChangeStage, useDeleteLead } from '../api.js';
import { daysInStage, formatDay } from '../leadDisplay.js';
import { rupees } from '../leadForm.js';
import CloseDialog from './CloseDialog.jsx';
import LeadEditModal from './LeadEditModal.jsx';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
/**
 * Leads as a table: used by the Pipeline page and by the Leads tab of a company.
 * The stage is changed right in the row; everything else through the one lead form.
 *
 * @param {{ rows: object[], stages: object[], caption: string, sort?: string,
 *           onSortChange?: (sort: string) => void, isRefreshing?: boolean,
 *           showAccount?: boolean, via?: string }} props
 *        stages: from the lead form options (id, name, type, isActive)
 *        via: where a stage change is made from here, for the stage history
 */
export default function LeadsTable({
  rows,
  stages,
  caption,
  sort,
  onSortChange,
  isRefreshing,
  showAccount = true,
  via = 'pipeline',
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
    if (stage.type === 'open') move.mutate({ id: lead.id, stageId, via });
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
          {/* The name opens the lead's own page. */}
          <Link
            to={`/pipeline/${row.id}`}
            className="font-medium hover:text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {row.name}
          </Link>
          {showAccount && row.account && (
            <Link
              to={`/accounts/${row.account.id}`}
              className="block text-text-muted hover:text-brand-text hover:underline"
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
          via={via}
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
