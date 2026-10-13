import { useRef } from 'react';
import { Check, Mic, Paperclip, Sparkles, Upload, X } from 'lucide-react';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useMeetingRecord, useMeetingRecordActions } from '../api.js';
import { formatMoment } from '../dates.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const LISTS = [
  ['clientProblems', 'The customer’s problems'],
  ['machinesDiscussed', 'Machines talked about'],
  ['technicalRequirements', 'Technical needs'],
  ['decisionMakers', 'Who decides'],
  ['competitors', 'Competitors'],
  ['commitments', 'Promises'],
  ['nextSteps', 'Next steps'],
  ['risks', 'Risks'],
  ['missingInformation', 'Still to find out'],
];
const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * What is kept after a meeting: pictures, documents and voice notes; the AI's summary of the
 * notes; and the tasks it proposes (a task exists only once a person accepts it).
 * @param {{ meetingId: string, canEdit: boolean, hasNotes: boolean }} props
 */
export default function MeetingRecord({ meetingId, canEdit, hasNotes }) {
  const record = useMeetingRecord(meetingId);
  const { upload, transcribe, summarize, decide } = useMeetingRecordActions(meetingId);
  const picker = useRef(null);
  const files = record.data?.files ?? [];
  const summary = record.data?.summary;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <section aria-label="Files of the meeting" className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Pictures, documents, voice notes</h3>
          {canEdit && (
            <>
              <input
                ref={picker}
                type="file"
                hidden
                aria-label="A file of the meeting"
                onChange={(event) => {
                  const [file] = event.target.files;
                  event.target.value = '';
                  if (file) upload.mutate(file);
                }}
              />
              <button
                type="button"
                className={smallButton}
                disabled={upload.isPending}
                onClick={() => picker.current.click()}
              >
                <Upload size={12} aria-hidden="true" />
                {upload.isPending ? 'Uploading…' : 'Add a file'}
              </button>
            </>
          )}
        </div>
        {record.isSuccess && files.length === 0 && (
          <p className="text-xs text-text-muted">
            Nothing yet. A voice note you add can be turned into text for the notes.
          </p>
        )}
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.url} className="flex flex-wrap items-center gap-2 text-sm">
              {file.isAudio ? (
                <Mic size={13} aria-hidden="true" className="shrink-0 text-text-muted" />
              ) : (
                <Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-muted" />
              )}
              <a
                href={file.link}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate hover:text-brand-text hover:underline"
              >
                {file.filename}
              </a>
              <span className="text-xs text-text-muted">{formatSize(file.size)}</span>
              {file.isAudio && canEdit && (
                <button
                  type="button"
                  className={smallButton}
                  disabled={transcribe.isPending}
                  onClick={() => transcribe.mutate({ url: file.url })}
                >
                  {transcribe.isPending && transcribe.variables?.url === file.url
                    ? 'Listening…'
                    : 'Turn into text for the notes'}
                </button>
              )}
            </li>
          ))}
        </ul>
        <FormError
          message={record.error?.message ?? upload.error?.message ?? transcribe.error?.message}
        />
      </section>

      <section aria-label="AI summary of the meeting" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-medium">
            <span className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand-text">
              <Sparkles size={11} aria-hidden="true" />
              AI
            </span>
            Summary of the meeting
          </h3>
          {canEdit && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={summarize.isPending || !hasNotes}
              title={hasNotes ? undefined : 'Write and save the notes first'}
              onClick={() => summarize.mutate()}
            >
              <Sparkles size={16} aria-hidden="true" />
              {summarize.isPending
                ? 'Summarizing…'
                : summary
                  ? 'Make it again from the notes'
                  : 'Summarize the notes'}
            </button>
          )}
        </div>
        {!summary && record.isSuccess && (
          <p className="text-xs text-text-muted">
            {hasNotes
              ? 'Not made yet. The AI works only from the saved notes, and proposes tasks.'
              : 'Save the notes of the meeting first; then the AI can summarize them.'}
          </p>
        )}
        <FormError message={summarize.error?.message ?? decide.error?.message} />
        {summary && (
          <div className="space-y-2 rounded-md border border-border bg-page p-2 text-sm">
            <p className="break-words">{summary.summary}</p>
            {summary.budget && (
              <p className="break-words">
                <span className="font-medium">Budget:</span> {summary.budget}
              </p>
            )}
            {LISTS.filter(([key]) => summary[key].length > 0).map(([key, title]) => (
              <div key={key}>
                <p className="font-medium">{title}</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {summary[key].map((item) => (
                    <li key={item} className="break-words">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {summary.proposedTasks.length > 0 && (
              <div>
                <p className="font-medium">Proposed tasks</p>
                <ul aria-label="Proposed tasks" className="space-y-1">
                  {summary.proposedTasks.map((task) => (
                    <li key={task.index} className="flex flex-wrap items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 break-words ${task.status === 'rejected' ? 'text-text-muted line-through' : ''}`}
                      >
                        {task.title}
                        {task.dueAt && (
                          <span className="text-xs text-text-muted">
                            {' '}
                            · by {formatMoment(task.dueAt)}
                          </span>
                        )}
                      </span>
                      {task.status === 'accepted' && (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          <Check size={12} aria-hidden="true" />
                          Is a task now
                        </span>
                      )}
                      {task.status === 'pending' && summary.permissions.canEdit && (
                        <>
                          <button
                            type="button"
                            className={smallButton}
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ index: task.index, decision: 'accept' })}
                          >
                            <Check size={12} aria-hidden="true" />
                            Make it a task
                          </button>
                          <button
                            type="button"
                            aria-label={`Reject: ${task.title}`}
                            className={smallButton}
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ index: task.index, decision: 'reject' })}
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-text-muted">
              Written by AI from the notes, {formatMoment(summary.madeAt)}. Check it against what
              was really said.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
