import { ListPlus } from 'lucide-react';
import AiCard, { AiList } from '../../../components/shared/AiCard.jsx';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useInsight } from '../api.js';

const RISK = {
  low: ['Low risk', 'border-success text-success'],
  medium: ['Medium risk', 'border-warning text-text'],
  high: ['High risk', 'border-danger text-danger'],
};

// The AI's view of one lead: a score with its reasons, and the next best action, which the
// person can turn into a task. It is advice: it never changes the stage, the owner or a price.
export default function LeadAiAssessment({ leadId }) {
  const can = useCan();
  const { saved, refresh, feedback, accept } = useInsight('leads', leadId);
  const insight = saved.data?.insight ?? null;
  const content = insight?.content;
  const risk = RISK[content?.riskLevel];
  const madeTask = Boolean(insight?.myFeedback?.taskId);

  return (
    <AiCard
      title="Score and next best action"
      insight={insight}
      isAiReady={saved.data?.isAiReady ?? false}
      isLoading={saved.isPending}
      refresh={refresh}
      feedback={feedback}
      askLabel="Assess this lead"
      emptyText="Not assessed yet. The AI can score this lead and suggest the next step from its history."
    >
      {content && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p>
              <span className="text-3xl font-semibold">{content.score}</span>
              <span className="text-text-muted"> / 100</span>
            </p>
            {risk && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${risk[1]}`}>
                {risk[0]}
              </span>
            )}
          </div>
          <div className="mt-3 rounded-md border border-border bg-page p-3">
            <h3 className="text-sm font-medium">Next best action</h3>
            <p className="font-medium break-words">{content.nextBestAction.action}</p>
            <p className="text-sm break-words text-text-muted">
              Why: {content.nextBestAction.reason}
            </p>
            {can('tasks', 'create') && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${secondaryButtonClass} px-2 py-1 text-xs`}
                  disabled={madeTask || accept.isPending}
                  onClick={() => accept.mutate()}
                >
                  <ListPlus size={12} aria-hidden="true" />
                  {accept.isPending ? 'Adding…' : 'Add as my task'}
                </button>
                {madeTask && (
                  <span role="status" className="text-xs text-success">
                    It is in your tasks, due in 2 days.
                  </span>
                )}
              </div>
            )}
            <FormError message={accept.error?.message} />
          </div>
          <AiList title="Speaks for it" items={content.positives} tone="text-success" />
          <AiList title="Speaks against it" items={content.concerns} tone="text-danger" />
          <AiList title="To find out" items={content.missingInformation} />
        </>
      )}
    </AiCard>
  );
}
