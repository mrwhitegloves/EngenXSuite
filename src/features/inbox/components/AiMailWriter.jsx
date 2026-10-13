import { useState } from 'react';
import { Sparkles, Undo2 } from 'lucide-react';
import {
  FormError,
  compactInputClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useMailActions } from '../api.js';
import { smallButton } from '../mailFormat.js';
import { AiBox } from './ThreadAiTools.jsx';

const ISSUE_LABELS = {
  mistake: 'Mistake',
  tone: 'Tone',
  unclear: 'Not clear',
  missing: 'Missing',
  risk: 'Careful',
};
const VARIANT_LABELS = { short: 'Short', detailed: 'Detailed', formal: 'Formal' };

const MODES = {
  reply: 'Answer the newest mail',
  follow_up: 'Next mail, from the whole conversation',
  new: 'A first mail',
};
// One press: ask for this change (or, with an empty mail, write it this way).
const QUICK_ASKS = [
  'Make it shorter',
  'Make it more formal',
  'Make it warmer',
  'Ask for a call this week',
  'End with one clear next step',
  'Write it in Hindi',
];

/**
 * The AI's help while writing a mail. It writes the mail (an answer, the next mail of the
 * conversation, or a first mail) and then changes it as often as asked: every wish is one step,
 * and the last step can be undone. Nothing is sent by it.
 *
 * @param {{ thread?: object, accountId?: string, contactId?: string,
 *           draft: { subject: string, body: string },
 *           onDraft: (draft: { subject: string, body: string }) => void }} props
 *        thread: the open conversation (with its messages); without it, a first mail is written
 */
export default function AiMailWriter({ thread, accountId, contactId, draft, onDraft }) {
  const { write, assist } = useMailActions(thread?.id);
  // The answer of "Check it" or "Three versions"; closed again when the mail changes.
  const [extra, setExtra] = useState(null);
  const askExtra = (kind) =>
    assist.mutate(
      {
        kind,
        mode: mode === 'new' ? 'reply' : mode,
        ...(draft.body.trim() ? { draft: draft.body.slice(0, 8000) } : {}),
        ...(kind === 'variants' && wish.trim() ? { instruction: wish.trim() } : {}),
      },
      { onSuccess: (payload) => setExtra({ kind, answer: payload.data }) },
    );
  const take = (label, body) => {
    setSteps((list) => [...list, { label: `Took the ${label} version`, before: draft }]);
    onDraft({ subject: draft.subject, body });
    setExtra(null);
  };
  const modes = thread
    ? [
        ...(thread.messages.some((message) => message.direction === 'inbound') ? ['reply'] : []),
        'follow_up',
      ]
    : ['new'];
  const [mode, setMode] = useState(modes[0]);
  const [wish, setWish] = useState('');
  // What was asked so far, each with the mail as it was before: the last one can be undone.
  const [steps, setSteps] = useState([]);
  const hasDraft = Boolean(draft.body.trim());

  const ask = (instruction, isChange) =>
    write.mutate(
      {
        mode,
        ...(thread ? { threadId: thread.id } : { accountId, contactId }),
        ...(instruction ? { instruction } : {}),
        ...(isChange
          ? { draft: { subject: draft.subject.slice(0, 300), body: draft.body.slice(0, 8000) } }
          : {}),
      },
      {
        onSuccess: (payload) => {
          setSteps((list) => [
            ...list,
            {
              label: isChange ? instruction : `Wrote: ${MODES[mode].toLowerCase()}`,
              before: draft,
            },
          ]);
          onDraft(payload.data);
          setWish('');
        },
      },
    );
  const undo = () => {
    onDraft(steps.at(-1).before);
    setSteps((list) => list.slice(0, -1));
  };

  return (
    <section aria-label="Write with AI" className="space-y-2 rounded-md border border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand-text">
          <Sparkles size={11} aria-hidden="true" />
          AI
        </span>
        {modes.length > 1 ? (
          <select
            aria-label="What the AI should write"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className={`${compactInputClass} text-sm`}
          >
            {modes.map((id) => (
              <option key={id} value={id}>
                {MODES[id]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm">{MODES[mode]}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          aria-label="Your wish for the AI"
          placeholder={
            hasDraft
              ? 'What to change: “say Friday, not Monday”, “remove the second paragraph”…'
              : 'Optional: what the mail should say'
          }
          maxLength={2000}
          value={wish}
          onChange={(event) => setWish(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!write.isPending && (wish.trim() || !hasDraft)) ask(wish.trim(), hasDraft);
          }}
          className={`${compactInputClass} min-w-0 flex-1 text-sm`}
        />
        {hasDraft && (
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={write.isPending || !wish.trim()}
            onClick={() => ask(wish.trim(), true)}
          >
            Change the mail
          </button>
        )}
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={write.isPending}
          onClick={() => ask(wish.trim(), false)}
        >
          <Sparkles size={16} aria-hidden="true" />
          {hasDraft ? 'Write it again' : 'Write the mail'}
        </button>
        {thread && (
          <>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={assist.isPending}
              onClick={() => askExtra('variants')}
            >
              Three versions
            </button>
            {hasDraft && (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={assist.isPending}
                onClick={() => askExtra('review')}
              >
                Check it
              </button>
            )}
          </>
        )}
      </div>
      {assist.isPending && (
        <p role="status" className="text-xs text-text-muted">
          The AI is reading…
        </p>
      )}
      {extra?.kind === 'review' && (
        <AiBox title="Check before sending" onClose={() => setExtra(null)}>
          <p className={extra.answer.isReadyToSend ? '' : 'text-danger'}>
            {extra.answer.isReadyToSend
              ? 'Nothing stands in the way of sending it.'
              : 'Look at these points before you send it.'}
          </p>
          {extra.answer.issues.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5">
              {extra.answer.issues.map((issue) => (
                <li key={issue.text} className="break-words">
                  <span className="font-medium">{ISSUE_LABELS[issue.kind]}:</span> {issue.text}
                </li>
              ))}
            </ul>
          )}
          {extra.answer.unansweredQuestions.length > 0 && (
            <>
              <p className="font-medium">The customer asked, and the mail does not answer:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {extra.answer.unansweredQuestions.map((question) => (
                  <li key={question} className="break-words">
                    {question}
                  </li>
                ))}
              </ul>
            </>
          )}
        </AiBox>
      )}
      {extra?.kind === 'variants' && (
        <AiBox title="Three versions: take one" onClose={() => setExtra(null)}>
          <ul className="space-y-2">
            {extra.answer.variants.map((variant) => (
              <li key={variant.label} className="rounded-md border border-border bg-surface p-2">
                <p className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{VARIANT_LABELS[variant.label]}</span>
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => take(variant.label, variant.body)}
                  >
                    Use this one
                  </button>
                </p>
                <p className="break-words whitespace-pre-wrap text-text-muted">{variant.body}</p>
              </li>
            ))}
          </ul>
        </AiBox>
      )}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ASKS.map((text) => (
          <button
            key={text}
            type="button"
            className={smallButton}
            disabled={write.isPending}
            onClick={() => ask(text, hasDraft)}
          >
            {text}
          </button>
        ))}
      </div>
      {write.isPending && (
        <p role="status" className="text-xs text-text-muted">
          The AI is writing…
        </p>
      )}
      {steps.length > 0 && (
        <div className="text-xs text-text-muted">
          <ol aria-label="What you asked" className="list-decimal space-y-0.5 pl-5">
            {steps.map((step, index) => (
              // The steps only grow or lose their last one, so the position is a stable key.
              <li key={index} className="break-words">
                {step.label}
              </li>
            ))}
          </ol>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <button type="button" className={smallButton} onClick={undo}>
              <Undo2 size={12} aria-hidden="true" />
              Undo the last step
            </button>
            Written by AI: read it, fill in anything in [square brackets], then send it yourself.
          </p>
        </div>
      )}
      <FormError message={write.error?.message ?? assist.error?.message} />
    </section>
  );
}
