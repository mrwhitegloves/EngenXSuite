import { RefreshCw, Sparkles } from 'lucide-react';
import { FormError, secondaryButtonClass } from './form.jsx';

const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

/**
 * THE frame of everything the AI wrote: an "AI" label, when and for whom it was written, and
 * the button that asks again. Every AI output on any screen sits inside one of these, so a
 * person always knows what is the AI's opinion and what is a fact of the CRM.
 *
 * @param {{ title: string, insight: { generatedAt: string, generatedBy?: string } | null,
 *           isAiReady: boolean, isLoading: boolean, refresh: object, askLabel: string,
 *           emptyText: string, children: any }} props
 *        refresh: the mutation that asks the AI; askLabel: the button text when nothing exists yet
 */
export default function AiCard({
  title,
  insight,
  isAiReady,
  isLoading,
  refresh,
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
          {children}
          <p className="mt-3 text-xs text-text-muted">
            Written by AI from the CRM records on {formatMoment(insight.generatedAt)}
            {insight.generatedBy && <> · asked by {insight.generatedBy}</>}. It can be wrong: check
            before you act.
          </p>
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
