import { RefreshCw } from 'lucide-react';
import { FormError } from '../../../components/shared/form.jsx';
import { AiBox } from '../../inbox/components/ThreadAiTools.jsx';

const useButton =
  'shrink-0 rounded-md border border-border px-2 py-0.5 text-xs hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand';

// One line the person can put into the message box.
function Suggestion({ label, text, onUse }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <span className="min-w-0">
        {label && <span className="block text-xs font-semibold text-text-muted">{label}</span>}
        <span className="block break-words whitespace-pre-wrap">{text}</span>
      </span>
      <button type="button" className={useButton} onClick={() => onUse(text)}>
        Use
      </button>
    </li>
  );
}

/**
 * "What should I say?": the AI's reply to the customer's newest message (in their language),
 * questions worth asking, the next step and tips. "Use" puts a text in the box; the person
 * edits it and presses Send. Nothing is sent by the AI.
 * @param {{ assist: object, onUse: (text: string) => void, onClose: () => void }} props
 *        assist: the mutation from useChatActions
 */
export default function SuggestPanel({ assist, onUse, onClose }) {
  const answer = assist.data?.kind === 'suggest' ? assist.data : null;
  const result = answer?.result;
  return (
    <div className="border-t border-border bg-surface px-3 py-2">
      <AiBox title="What should I say?" onClose={onClose}>
        {assist.isPending && <p className="text-text-muted">The AI is reading the chat…</p>}
        <FormError message={assist.error?.message} />
        {answer?.note && <p className="text-text-muted">{answer.note}</p>}
        {result && (
          <>
            <ul className="space-y-2">
              <Suggestion label="Reply" text={result.reply} onUse={onUse} />
              {result.ask.map((item) => (
                <Suggestion key={item.text} label={item.label} text={item.text} onUse={onUse} />
              ))}
              {result.next && (
                <Suggestion label={result.next.label} text={result.next.text} onUse={onUse} />
              )}
            </ul>
            {result.tips.length > 0 && (
              <div>
                <p className="font-medium">Tips</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {result.tips.map((tip) => (
                    <li key={tip.said}>
                      <span className="text-text-muted">They said: {tip.said}.</span> {tip.answer}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {!assist.isPending && (
          <button
            type="button"
            className={`${useButton} inline-flex items-center gap-1`}
            onClick={() => assist.mutate('suggest')}
          >
            <RefreshCw size={12} aria-hidden="true" />
            Ask again
          </button>
        )}
      </AiBox>
    </div>
  );
}
