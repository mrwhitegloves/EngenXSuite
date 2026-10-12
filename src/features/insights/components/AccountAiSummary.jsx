import AiCard, { AiList } from '../../../components/shared/AiCard.jsx';
import { useInsight } from '../api.js';

// The AI's summary of one company, on its Overview. Built from what the person may see.
export default function AccountAiSummary({ accountId }) {
  const { saved, refresh } = useInsight('accounts', accountId);
  const insight = saved.data?.insight ?? null;
  const content = insight?.content;

  return (
    <AiCard
      title="Company summary"
      insight={insight}
      isAiReady={saved.data?.isAiReady ?? false}
      isLoading={saved.isPending}
      refresh={refresh}
      askLabel="Write a summary"
      emptyText="No summary yet. The AI can write one from this company’s people, leads, tasks and history."
    >
      {content && (
        <>
          <p className="break-words">{content.summary}</p>
          <AiList title="What matters now" items={content.keyPoints} />
          <AiList title="Chances" items={content.opportunities} tone="text-success" />
          <AiList title="Risks" items={content.risks} tone="text-danger" />
          <AiList title="To find out" items={content.missingInformation} />
        </>
      )}
    </AiCard>
  );
}
