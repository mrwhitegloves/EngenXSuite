import { useState } from 'react';
import { ArrowLeft, Check, Pencil, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TagChips } from '../../../components/shared/Tags.jsx';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { RecordTasks } from '../../activities/components/Tasks.jsx';
import Timeline from '../../activities/components/Timeline.jsx';
import { useChangeStage, useLead, useLeadOptions, useStageHistory } from '../api.js';
import CloseDialog from '../components/CloseDialog.jsx';
import LeadEditModal from '../components/LeadEditModal.jsx';
import { daysInStage, formatDay, formatDuration, formatMoment } from '../leadDisplay.js';
import { BUDGET_LABELS, FEASIBILITY_LABELS, RISK_LABELS, rupees } from '../leadForm.js';

const SOURCE_LABELS = {
  manual: 'Typed in',
  meta_ads: 'Meta ads',
  website: 'Website',
  import: 'File import',
  email: 'Email',
  referral: 'Referral',
};
const VIA_LABELS = {
  automation: 'by the system',
  pipeline: 'on the pipeline',
  opportunity_page: 'on the lead page',
  account_page: 'on the company page',
  edit_form: 'in the edit form',
  import: 'by an import',
};

// A titled block of "label: value" lines. Lines without a value are left out.
function Block({ title, lines, children }) {
  const filled = lines.filter(([, value]) => value !== null && value !== undefined && value !== '');
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-text-muted uppercase">{title}</h2>
      {filled.length === 0 && !children ? (
        <p className="text-text-muted">Nothing filled in yet.</p>
      ) : (
        <dl className="space-y-1.5">
          {filled.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
              <dt className="text-text-muted">{label}</dt>
              <dd className="min-w-0 break-words whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

// The stages as a row of steps. Pressing one moves the lead there (through the stage service).
function StageBar({ lead, stages, onChoose, isBusy }) {
  const open = stages.filter(
    (stage) => stage.type === 'open' && (stage.isActive || stage.id === lead.stage?.id),
  );
  const closing = stages.filter((stage) => stage.type !== 'open' && stage.isActive);
  const currentIndex = open.findIndex((stage) => stage.id === lead.stage?.id);
  const canEdit = lead.permissions.canEdit;

  const step = (stage, isPassed) => {
    const isCurrent = stage.id === lead.stage?.id;
    return (
      <li key={stage.id} className="shrink-0">
        <button
          type="button"
          aria-current={isCurrent ? 'step' : undefined}
          disabled={!canEdit || isBusy || isCurrent}
          onClick={() => onChoose(stage)}
          className={[
            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand',
            isCurrent
              ? 'border-brand bg-brand font-medium text-on-brand'
              : isPassed
                ? 'border-border bg-brand-soft text-brand-text'
                : 'border-border bg-surface text-text-muted',
            canEdit && !isCurrent ? 'hover:border-text-muted' : '',
          ].join(' ')}
        >
          {isPassed && <Check size={13} aria-hidden="true" />}
          {stage.name}
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Pipeline stage" className="mb-4">
      {/* Only this row scrolls sideways, never the page. */}
      <ol className="flex gap-1.5 overflow-x-auto pb-2">
        {open.map((stage, index) => step(stage, currentIndex > -1 && index < currentIndex))}
        <li aria-hidden="true" className="mx-1 w-px shrink-0 bg-border" />
        {closing.map((stage) => step(stage, false))}
      </ol>
    </nav>
  );
}

function StageHistory({ leadId }) {
  const history = useStageHistory(leadId);
  const rows = history.data ?? [];
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-text-muted uppercase">Stage history</h2>
      <FormError message={history.error?.message} />
      <ol className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            <p>
              {row.from ? (
                <>
                  {row.from.name} → <strong>{row.to?.name}</strong>
                </>
              ) : (
                <>
                  Created in <strong>{row.to?.name}</strong>
                </>
              )}
            </p>
            <p className="text-text-muted">
              {formatMoment(row.changedAt)}
              {row.changedBy && <> · {row.changedBy.name}</>}
              {VIA_LABELS[row.via] && <> · {VIA_LABELS[row.via]}</>}
              {row.from && row.msInPreviousStage !== null && (
                <> · after {formatDuration(row.msInPreviousStage)}</>
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// One lead: everything about it on one page, with its tasks and its timeline. The AI area is
// filled when the AI part is built.
export default function LeadPage() {
  const { leadId } = useParams();
  const can = useCan();
  const lead = useLead(leadId);
  const options = useLeadOptions();
  const move = useChangeStage();
  const [isEditing, setIsEditing] = useState(false);
  const [closeStage, setCloseStage] = useState(null);
  const [now] = useState(() => Date.now());

  const backLink = (
    <Link
      to="/pipeline"
      className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      Pipeline
    </Link>
  );

  if (lead.isPending) {
    return (
      <>
        {backLink}
        <p role="status" className="text-text-muted">
          Loading the lead…
        </p>
      </>
    );
  }
  if (lead.isError) {
    return (
      <>
        {backLink}
        <FormError
          message={
            lead.error.status === 404
              ? 'This lead does not exist, or it is not one of yours.'
              : lead.error.message
          }
        />
      </>
    );
  }

  const data = lead.data;
  const contact = data.primaryContact;
  function chooseStage(stage) {
    move.reset();
    if (stage.type === 'open') {
      move.mutate({ id: data.id, stageId: stage.id, via: 'opportunity_page' });
    } else {
      setCloseStage(stage);
    }
  }

  return (
    <>
      {backLink}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold break-words">{data.name}</h1>
            {data.leadStatus && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                {data.leadStatus.name}
              </span>
            )}
            {data.status !== 'open' && (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${data.status === 'won' ? 'border-success text-success' : 'border-danger text-danger'}`}
              >
                {data.status === 'won' ? 'Won' : 'Lost'}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-text-muted">
            <span className="font-mono text-xs">{data.leadCode}</span>
            {data.account && (
              <>
                {' · '}
                <Link
                  to={`/accounts/${data.account.id}`}
                  className="hover:text-brand-text hover:underline"
                >
                  {data.account.name}
                </Link>
              </>
            )}
            {' · '}
            {data.owner ? `Owner: ${data.owner.name}` : 'Unassigned'}
          </p>
          <TagChips tags={data.tags} className="mt-2" />
        </div>
        {data.permissions.canEdit && (
          <button type="button" className={secondaryButtonClass} onClick={() => setIsEditing(true)}>
            <Pencil size={16} aria-hidden="true" />
            Edit
          </button>
        )}
      </header>

      {options.data && (
        <StageBar
          lead={data}
          stages={options.data.stages}
          onChoose={chooseStage}
          isBusy={move.isPending}
        />
      )}
      <FormError message={closeStage ? null : move.error?.message} />

      <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Value', rupees(data.estimatedValuePaise)],
          ['Chance of winning', data.probability === null ? '—' : `${data.probability}%`],
          ['Expected to close', formatDay(data.expectedCloseDate)],
          ['In this stage', daysInStage(data.stageEnteredAt, now)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 lg:grid-cols-2">
        <Block
          title="Next step"
          lines={[
            ['Next action', data.nextAction?.text],
            ['Due', data.nextAction?.dueAt && formatMoment(data.nextAction.dueAt)],
            ['Risk', RISK_LABELS[data.risk?.level]],
            ['Risk note', data.risk?.note],
          ]}
        />
        <section className="rounded-lg border border-dashed border-border bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-muted uppercase">
            <Sparkles size={15} aria-hidden="true" />
            Next best action and AI insights
          </h2>
          <p className="text-text-muted">
            Suggestions from the AI will show here once the AI part is built.
          </p>
        </section>
        <Block
          title="Requirement"
          lines={[
            ['What they need', data.requirement],
            ['The problem today', data.problemStatement],
            ['What it would improve', data.expectedImpact],
            ['Solutions', data.solutionCategories.map((item) => item.name).join(', ')],
            ['Feasibility', FEASIBILITY_LABELS[data.technicalFeasibility]],
          ]}
        />
        <Block
          title="Commercial"
          lines={[
            ['Budget', BUDGET_LABELS[data.budgetStatus]],
            ['They decide', data.decisionTimeline],
            ['Competitor', data.competitor],
            ['Closed on', data.closedAt && formatDay(data.closedAt)],
            [data.status === 'won' ? 'Why won' : 'Why lost', data.closeReason],
            ['Lost to', data.lostToCompetitor],
          ]}
        />
        <Block
          title="Company and people"
          lines={[
            ['Company', data.account?.name],
            ['Plant', data.plant?.name],
            [
              'Main contact',
              contact && [contact.name, contact.designation].filter(Boolean).join(', '),
            ],
            ['Phone', contact?.phone_number],
            ['Email', contact?.email],
            [
              'Also involved',
              data.stakeholders
                .map((item) => item.contact?.name)
                .filter(Boolean)
                .join(', '),
            ],
          ]}
        />
        <Block
          title="Who works on it"
          lines={[
            ['Owner', data.owner?.name ?? 'Unassigned'],
            ['Also assigned', data.assignedUsers.map((user) => user.name).join(', ')],
            ['Added by', data.formFilledBy?.name],
            ['Added on', formatDay(data.createdAt)],
            ['Source', SOURCE_LABELS[data.source] ?? data.source],
            ['Campaign', data.sourceDetail?.campaign],
            ['Ad', data.sourceDetail?.ad],
            ['Form', data.sourceDetail?.form],
          ]}
        />
        <StageHistory leadId={data.id} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {can('tasks', 'view') && <RecordTasks target={{ opportunityId: data.id }} />}
        <div className="space-y-2">
          <h2 className="font-semibold">Timeline</h2>
          <Timeline target={{ opportunityId: data.id }} canWrite={data.permissions.canEdit} />
        </div>
      </div>

      {isEditing && <LeadEditModal leadId={data.id} onClose={() => setIsEditing(false)} />}
      {closeStage && (
        <CloseDialog
          key={closeStage.id}
          lead={data}
          stage={closeStage}
          move={move}
          via="opportunity_page"
          onClose={() => setCloseStage(null)}
        />
      )}
    </>
  );
}
