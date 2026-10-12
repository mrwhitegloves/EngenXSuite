import { useState } from 'react';
import { PenLine, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { FormError, inputClass, primaryButtonClass, secondaryButtonClass } from './form.jsx';

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

const opinionButton = (isChosen) =>
  [
    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand',
    isChosen
      ? 'border-brand bg-brand-soft font-medium text-brand-text'
      : 'border-border hover:border-text-muted',
  ].join(' ');

// "Was this useful?": useful, not useful, or what it should have said. One opinion per person;
// it can be changed. This is what later shows which kind of answer needs to get better.
function Opinion({ mine, feedback }) {
  const [draft, setDraft] = useState(null); // null = the correction box is closed
  const send = (verdict, note) =>
    feedback.mutate({ verdict, note }, { onSuccess: () => setDraft(null) });

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Was this useful?</span>
        <button
          type="button"
          aria-pressed={mine?.verdict === 'accepted'}
          className={opinionButton(mine?.verdict === 'accepted')}
          disabled={feedback.isPending}
          onClick={() => send('accepted')}
        >
          <ThumbsUp size={12} aria-hidden="true" />
          Useful
        </button>
        <button
          type="button"
          aria-pressed={mine?.verdict === 'rejected'}
          className={opinionButton(mine?.verdict === 'rejected')}
          disabled={feedback.isPending}
          onClick={() => send('rejected')}
        >
          <ThumbsDown size={12} aria-hidden="true" />
          Not useful
        </button>
        <button
          type="button"
          aria-pressed={mine?.verdict === 'edited'}
          className={opinionButton(mine?.verdict === 'edited')}
          disabled={feedback.isPending}
          onClick={() => {
            feedback.reset();
            setDraft(mine?.verdict === 'edited' ? (mine.note ?? '') : '');
          }}
        >
          <PenLine size={12} aria-hidden="true" />
          Correct it
        </button>
      </div>
      {mine?.verdict === 'edited' && draft === null && (
        <p className="text-xs break-words text-text-muted">Your correction: {mine.note}</p>
      )}
      {draft !== null && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            send('edited', draft.trim());
          }}
        >
          <textarea
            aria-label="What it should have said"
            rows={2}
            maxLength={2000}
            autoFocus
            placeholder="What was wrong, or what it should have said"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className={`${primaryButtonClass} px-2 py-1 text-xs`}
              disabled={!draft.trim() || feedback.isPending}
            >
              {feedback.isPending ? 'Saving…' : 'Save correction'}
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} px-2 py-1 text-xs`}
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <FormError message={feedback.error?.message} />
    </div>
  );
}

/**
 * THE frame of everything the AI wrote: an "AI" label, when it was written, whether the records
 * changed since, the button that asks again, and "was this useful?". Every AI output on any
 * screen sits inside one of these, so a person always knows what is the AI's opinion and what
 * is a fact of the CRM.
 *
 * @param {{ title: string, isAiReady: boolean, isLoading: boolean, refresh: object,
 *           feedback: object, askLabel: string, emptyText: string, children: any,
 *           insight: { generatedAt: string, generatedBy?: string, isStale?: boolean,
 *                      myFeedback?: object } | null }} props
 *        refresh: the mutation that asks the AI; feedback: the mutation that saves my opinion;
 *        askLabel: the button text when nothing exists yet
 */
export default function AiCard({
  title,
  insight,
  isAiReady,
  isLoading,
  refresh,
  feedback,
  askLabel,
  emptyText,
  children,
}) {
  return (
    <section aria-label={title} className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted uppercase">
          <span className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand-text normal-case">
            <Sparkles size={12} aria-hidden="true" />
            AI
          </span>
          {title}
        </h2>
        {isAiReady && (
          <button
            type="button"
            className={`${secondaryButtonClass} px-2 py-1 text-xs`}
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw
              size={12}
              aria-hidden="true"
              className={refresh.isPending ? 'animate-spin' : ''}
            />
            {refresh.isPending ? 'Thinking…' : insight ? 'Ask again' : askLabel}
          </button>
        )}
      </div>

      {isLoading && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {!isLoading && !isAiReady && (
        <p className="text-text-muted">AI is not set up yet. Ask the person who runs the system.</p>
      )}
      {!isLoading && isAiReady && !insight && !refresh.isPending && (
        <p className="text-text-muted">{emptyText}</p>
      )}
      {refresh.isPending && !insight && (
        <p role="status" className="text-text-muted">
          Reading the records. This takes a few seconds…
        </p>
      )}
      <FormError message={refresh.error?.message} />
      {insight && (
        <>
          {insight.isStale && (
            <p role="note" className="mb-2 rounded-md border border-warning p-2 text-sm">
              The records changed since this was written. “Ask again” for a fresh answer.
            </p>
          )}
          {children}
          <p className="mt-3 text-xs text-text-muted">
            Written by AI from the CRM records on {formatMoment(insight.generatedAt)}
            {insight.generatedBy ? (
              <> · asked by {insight.generatedBy}</>
            ) : (
              ' · refreshed by itself'
            )}
            . It can be wrong: check before you act.
          </p>
          <Opinion key={insight.generatedAt} mine={insight.myFeedback} feedback={feedback} />
        </>
      )}
    </section>
  );
}

/** A titled list inside an AI card; shows nothing when the list is empty. */
export function AiList({ title, items, tone = '' }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <h3 className={`text-sm font-medium ${tone}`}>{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item) => (
          <li key={item} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
