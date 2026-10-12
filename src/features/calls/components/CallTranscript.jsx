import { FileText, RefreshCw } from 'lucide-react';
import { FormError } from '../../../components/shared/form.jsx';
import AskAiButton from '../../assistant/components/AskAiButton.jsx';
import { useCallTranscript, useMakeTranscript } from '../api.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

/**
 * The text of one recorded call. It is made from the recording only when someone presses the
 * button (it costs a little), is kept with the call, and can be made again. From the text the
 * AI assistant can summarise the call and answer questions about it.
 *
 * @param {{ call: { id: string }, who: string }} props  who: the other side's name or number
 */
export default function CallTranscript({ call, who }) {
  const saved = useCallTranscript(call.id);
  const make = useMakeTranscript(call.id);
  const transcript = saved.data?.transcript ?? null;

  return (
    <div className="space-y-2 rounded-md border border-border bg-page p-2">
      <FormError message={saved.error?.message ?? make.error?.message} />
      {saved.isPending && (
        <p role="status" className="text-xs text-text-muted">
          Loading…
        </p>
      )}
      {saved.data && !saved.data.isAiReady && (
        <p className="text-xs text-text-muted">AI is not set up yet.</p>
      )}
      {saved.data && !transcript && !make.isPending && (
        <p className="text-xs text-text-muted">
          There is no text of this call yet. It is made from the recording when you ask for it.
        </p>
      )}
      {make.isPending && (
        <p role="status" className="text-xs text-text-muted">
          Listening to the recording. This can take a minute…
        </p>
      )}
      {transcript && (
        <>
          <p
            aria-label={`Text of the call with ${who}`}
            className="max-h-56 overflow-y-auto text-sm break-words whitespace-pre-wrap"
          >
            {transcript.text}
          </p>
          <p className="text-xs text-text-muted">
            Written by AI from the recording on {formatMoment(transcript.generatedAt)}
            {transcript.generatedBy && <> · asked by {transcript.generatedBy}</>}. It can mishear:
            listen to the recording for anything that matters.
          </p>
        </>
      )}
      {saved.data?.isAiReady && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={smallButton}
            disabled={make.isPending}
            onClick={() => make.mutate()}
          >
            {transcript ? (
              <RefreshCw size={12} aria-hidden="true" />
            ) : (
              <FileText size={12} aria-hidden="true" />
            )}
            {transcript ? 'Make the text again' : 'Make the text from the recording'}
          </button>
          {transcript && (
            <>
              <AskAiButton
                small
                label="Summarise with AI"
                record={{ type: 'call', id: call.id, title: `Call with ${who}` }}
                question="Summarise this call: what was discussed, what was agreed, and what should happen next."
              />
              <AskAiButton
                small
                label="Ask AI about this call"
                record={{ type: 'call', id: call.id, title: `Call with ${who}` }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
