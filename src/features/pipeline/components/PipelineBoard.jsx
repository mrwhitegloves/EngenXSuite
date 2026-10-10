import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GripVertical, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TagChips } from '../../../components/shared/Tags.jsx';
import { FormError } from '../../../components/shared/form.jsx';
import { useChangeStage } from '../api.js';
import { daysInStage, formatDay } from '../leadDisplay.js';
import { rupees } from '../leadForm.js';
import CloseDialog from './CloseDialog.jsx';
import LeadEditModal from './LeadEditModal.jsx';

const RISK_CLASS = { high: 'text-danger', medium: 'text-warning', low: 'text-text-muted' };

// One lead on the board. It is dragged by its handle, so the name stays a normal link and the
// card can still be scrolled past with a finger on a phone.
function LeadCard({ lead, now, onEdit, isMoving }) {
  const canMove = lead.permissions.canEdit;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled: !canMove,
  });
  return (
    <li
      ref={setNodeRef}
      // While it is dragged the card follows the pointer.
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={[
        'rounded-md border border-border bg-surface p-2.5 text-sm shadow-sm',
        isDragging ? 'relative z-10 opacity-90 shadow-lg' : '',
        isMoving ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-1">
        {canMove && (
          <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label={`Move ${lead.name} to another stage`}
            className="-ml-1 cursor-grab touch-none rounded p-0.5 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/pipeline/${lead.id}`}
            className="font-medium break-words hover:text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {lead.name}
          </Link>
          <p className="truncate text-text-muted">{lead.account?.name ?? '—'}</p>
        </div>
        {canMove && (
          <button
            type="button"
            aria-label={`Edit ${lead.name}`}
            onClick={() => onEdit(lead.id)}
            className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-medium">{rupees(lead.estimatedValuePaise)}</span>
        {lead.probability !== null && (
          <span className="text-xs text-text-muted">{lead.probability}%</span>
        )}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {lead.owner?.name ?? <span className="text-warning">Unassigned</span>} ·{' '}
        {daysInStage(lead.stageEnteredAt, now)} here
      </p>
      {lead.nextAction?.text && (
        <p className="mt-1 text-xs break-words">
          Next: {lead.nextAction.text}
          {lead.nextAction.dueAt && (
            <span className="text-text-muted"> (by {formatDay(lead.nextAction.dueAt)})</span>
          )}
        </p>
      )}
      {lead.risk?.level && (
        <p className={`mt-1 text-xs ${RISK_CLASS[lead.risk.level]}`}>Risk: {lead.risk.level}</p>
      )}
      <TagChips tags={lead.tags} className="mt-1.5" />
    </li>
  );
}

// One stage of the pipeline: a place to drop a card.
function StageColumn({ column, now, onEdit, movingId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.stage.id,
    data: { stage: column.stage },
  });
  const hidden = column.count - column.leads.length;
  return (
    <section
      ref={setNodeRef}
      aria-label={column.stage.name}
      className={[
        'flex w-64 shrink-0 flex-col rounded-lg border bg-page',
        isOver ? 'border-brand' : 'border-border',
      ].join(' ')}
    >
      <header className="border-b border-border px-3 py-2">
        <h3 className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span className="truncate">{column.stage.name}</span>
          <span className="rounded-full border border-border px-2 text-xs font-normal text-text-muted">
            {column.count}
          </span>
        </h3>
        <p className="text-xs text-text-muted">{rupees(column.valuePaise)}</p>
      </header>
      <ul className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {column.leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            now={now}
            onEdit={onEdit}
            isMoving={movingId === lead.id}
          />
        ))}
        {column.leads.length === 0 && (
          <li className="py-4 text-center text-xs text-text-muted">No leads here</li>
        )}
      </ul>
      {hidden > 0 && (
        <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
          {hidden} more in this stage. The table view shows all of them.
        </p>
      )}
    </section>
  );
}

/**
 * The pipeline as a board: one column per stage, one card per lead. Dropping a card on another
 * column changes its stage through the server's stage service; won and lost ask for the reason.
 *
 * @param {{ columns: object[] }} props  From GET /api/opportunities/board
 */
export default function PipelineBoard({ columns }) {
  const move = useChangeStage();
  const [editId, setEditId] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [now] = useState(() => Date.now());
  const sensors = useSensors(
    // A small distance before a drag starts, so a click on the handle is not a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd({ active, over }) {
    const lead = active.data.current?.lead;
    const stage = over?.data.current?.stage;
    if (!lead || !stage || stage.id === lead.stage?.id) return;
    move.reset();
    if (stage.type === 'open') move.mutate({ id: lead.id, stageId: stage.id, via: 'pipeline' });
    else setCloseTarget({ lead, stage });
  }

  return (
    <>
      <FormError message={closeTarget ? null : move.error?.message} />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* Only the board scrolls sideways, never the page. */}
        <div
          role="region"
          aria-label="Pipeline board"
          tabIndex={0}
          className="flex items-stretch gap-3 overflow-x-auto pb-3 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {columns.map((column) => (
            <StageColumn
              key={column.stage.id}
              column={column}
              now={now}
              onEdit={setEditId}
              movingId={move.isPending ? move.variables?.id : null}
            />
          ))}
        </div>
      </DndContext>

      {editId && <LeadEditModal key={editId} leadId={editId} onClose={() => setEditId(null)} />}
      {closeTarget && (
        <CloseDialog
          key={`${closeTarget.lead.id}-${closeTarget.stage.id}`}
          lead={closeTarget.lead}
          stage={closeTarget.stage}
          move={move}
          via="pipeline"
          onClose={() => setCloseTarget(null)}
        />
      )}
    </>
  );
}
