import { useState } from 'react';
import { CalendarPlus, Check, ListChecks, Sparkles, Text, X } from 'lucide-react';
import { FormError } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useTaskActions } from '../../activities/api.js';
import MeetingDialog from '../../calendar/components/MeetingDialog.jsx';
import { MODE_LABELS } from '../../calendar/dates.js';
import { useMailActions } from '../api.js';
import { formatMoment, smallButton } from '../mailFormat.js';

const TOOLS = [
  { kind: 'summary', label: 'Summarize', icon: Text },
  { kind: 'tasks', label: 'Find the tasks', icon: ListChecks },
  { kind: 'meeting', label: 'Find a meeting', icon: CalendarPlus },
];

// A list with a heading; nothing when the list is empty.
function Points({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {items.map((item) => (
          <li key={item} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The box every AI answer on mail is shown in.
export function AiBox({ title, onClose, children }) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-page p-2 text-sm">
      <p className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand-text">
          <Sparkles size={11} aria-hidden="true" />
          AI
        </span>
        <span className="font-medium">{title}</span>
        {onClose && (
          <button
            type="button"
            aria-label={`Close: ${title}`}
            className="ml-auto rounded text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
            onClick={onClose}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </p>
      {children}
    </div>
  );
}

// The tasks the AI found: the person adds the ones they want.
function FoundTasks({ answer }) {
  const can = useCan();
  const { create } = useTaskActions();
  const [added, setAdded] = useState([]);
  const links = answer.opportunityId
    ? { opportunityId: answer.opportunityId }
    : answer.accountId
      ? { accountId: answer.accountId }
      : {};
  if (answer.tasks.length === 0) return <p>Nothing is left for us to do in this conversation.</p>;
  return (
    <>
      <ul className="space-y-1.5">
        {answer.tasks.map((task) => (
          <li key={task.title} className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block font-medium break-words">{task.title}</span>
              <span className="block text-xs break-words text-text-muted">
                {task.dueAt ? `By ${formatMoment(task.dueAt)} · ` : ''}
                {task.reason}
              </span>
            </span>
            {added.includes(task.title) ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-text-muted">
                <Check size={12} aria-hidden="true" />
                Added
              </span>
            ) : (
              can('tasks', 'create') && (
                <button
                  type="button"
                  className={`${smallButton} shrink-0`}
                  disabled={create.isPending}
                  onClick={() =>
                    create.mutate(
                      {
                        title: task.title,
                        description: task.reason,
                        type: 'follow_up',
                        priority: 'medium',
                        dueAt: task.dueAt,
                        ...links,
                        ...(answer.contactId ? { contactId: answer.contactId } : {}),
                      },
                      { onSuccess: () => setAdded((list) => [...list, task.title]) },
                    )
                  }
                >
                  Add as a task
                </button>
              )
            )}
          </li>
        ))}
      </ul>
      <FormError message={create.error?.message} />
    </>
  );
}

// The meeting the AI found: the person opens the meeting form, filled in, and decides.
function FoundMeeting({ answer }) {
  const can = useCan();
  const [isPlanning, setIsPlanning] = useState(false);
  if (!answer.wantsMeeting)
    return <p>No call, meeting or visit is asked for in this conversation.</p>;
  const target = answer.opportunityId
    ? { opportunityId: answer.opportunityId, accountId: answer.accountId }
    : answer.accountId
      ? { accountId: answer.accountId }
      : undefined;
  return (
    <>
      <p className="break-words">
        <span className="font-medium">{answer.title}</span> · {MODE_LABELS[answer.mode]} ·{' '}
        {answer.startAt ? formatMoment(answer.startAt) : 'no day named yet'} ·{' '}
        {answer.durationMinutes} minutes
      </p>
      <p className="text-xs break-words text-text-muted">{answer.reason}</p>
      {can('meetings', 'create') && (
        <button type="button" className={smallButton} onClick={() => setIsPlanning(true)}>
          <CalendarPlus size={12} aria-hidden="true" />
          Plan this meeting
        </button>
      )}
      {isPlanning && (
        <MeetingDialog
          target={target}
          initial={{
            title: answer.title,
            mode: answer.mode,
            startAt: answer.startAt,
            minutes: answer.durationMinutes,
            contactIds: answer.contactId ? [answer.contactId] : [],
          }}
          onClose={() => setIsPlanning(false)}
        />
      )}
    </>
  );
}

/**
 * The AI's helps on one conversation: a summary, the tasks our side has, and a meeting the
 * mails ask for. The AI creates nothing: a task or a meeting is made by the person.
 * @param {{ threadId: string }} props
 */
export default function ThreadAiTools({ threadId }) {
  const { assist } = useMailActions(threadId);
  const [result, setResult] = useState(null);
  const run = (tool) =>
    assist.mutate(
      { kind: tool.kind },
      { onSuccess: (payload) => setResult({ tool, answer: payload.data }) },
    );
  const answer = result?.answer;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.kind}
            type="button"
            className={smallButton}
            disabled={assist.isPending}
            onClick={() => run(tool)}
          >
            <tool.icon size={12} aria-hidden="true" />
            {assist.isPending && assist.variables?.kind === tool.kind ? 'Reading…' : tool.label}
          </button>
        ))}
      </div>
      <FormError message={assist.error?.message} />
      {result && (
        <AiBox title={result.tool.label} onClose={() => setResult(null)}>
          {result.tool.kind === 'summary' && (
            <>
              <p className="break-words">{answer.summary}</p>
              <Points title="The customer asks for" items={answer.customerAsks} />
              <Points title="We promised" items={answer.wePromised} />
              <Points title="Still open" items={answer.openQuestions} />
            </>
          )}
          {result.tool.kind === 'tasks' && <FoundTasks answer={answer} />}
          {result.tool.kind === 'meeting' && <FoundMeeting answer={answer} />}
        </AiBox>
      )}
    </div>
  );
}

// What a file says, on a press of its "AI summary" button.
export function FileSummary({ file }) {
  const { fileSummary } = useMailActions();
  const [isOpen, setIsOpen] = useState(false);
  const answer = fileSummary.data?.data;
  return (
    <>
      <button
        type="button"
        className="ml-1 text-xs text-text-muted hover:text-brand-text hover:underline"
        disabled={fileSummary.isPending}
        onClick={() => {
          setIsOpen(true);
          if (!answer) fileSummary.mutate({ url: file.url });
        }}
      >
        {fileSummary.isPending ? 'Reading…' : 'AI summary'}
      </button>
      {isOpen && (answer || fileSummary.error) && (
        <div className="mt-1 basis-full">
          <AiBox title={file.filename} onClose={() => setIsOpen(false)}>
            <FormError message={fileSummary.error?.message} />
            {answer && (
              <>
                <p className="break-words">{answer.summary}</p>
                <Points title="What matters" items={answer.keyPoints} />
                <Points title="Numbers and dates" items={answer.figures} />
              </>
            )}
          </AiBox>
        </div>
      )}
    </>
  );
}
