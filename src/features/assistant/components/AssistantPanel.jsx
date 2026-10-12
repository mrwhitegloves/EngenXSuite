import { useEffect, useRef, useState } from 'react';
import { Paperclip, Plus, Send, SlidersHorizontal, Sparkles, Trash2, X } from 'lucide-react';
import {
  FormError,
  compactInputClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';
import { useAssistant } from '../assistantContext.js';
import RecordPicker from './RecordPicker.jsx';

const RECORD_WORDS = { lead: 'Lead', account: 'Company', contact: 'Person', call: 'Call' };
const iconButton =
  'rounded-md border border-border p-1.5 text-text-muted hover:border-text-muted hover:text-text disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const STARTERS = [
  'Summarise where this stands in five short points.',
  'What should I do next, and why?',
  'Draft a short follow-up message to the customer.',
];

// One message: the person's on the right, the AI's on the left with its label.
function Message({ message }) {
  const isMine = message.role === 'user';
  return (
    <li className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm ${isMine ? 'border-brand bg-brand-soft' : 'border-border bg-page'}`}
      >
        {!isMine && (
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-text">
            <Sparkles size={11} aria-hidden="true" />
            AI
          </p>
        )}
        {message.content && <p className="break-words whitespace-pre-wrap">{message.content}</p>}
        {message.attachments?.map((file) => (
          <p key={file.name} className="mt-1 flex items-center gap-1 text-xs text-text-muted">
            <Paperclip size={11} aria-hidden="true" />
            {file.name}
          </p>
        ))}
      </div>
    </li>
  );
}

/**
 * THE AI assistant: a panel on the right side of every screen. Conversations are kept in this
 * browser only and removed at sign-out; the AI sees only the records attached to the
 * conversation, and of those only what the person may see.
 */
export default function AssistantPanel() {
  const assistant = useAssistant();
  const { active, isBusy } = assistant;
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState([]); // files of the message being written, as text
  const [fileState, setFileState] = useState({ isReading: false, error: null });
  const [showOptions, setShowOptions] = useState(false);
  const fileInput = useRef(null);
  const end = useRef(null);
  const messageCount = active?.messages.length ?? 0;

  // Keep the newest message in view; close with Escape.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messageCount, isBusy, assistant.isOpen]);
  useEffect(() => {
    if (!assistant.isOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && assistant.close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assistant]);

  if (!assistant.isOpen) return null;

  function submit(text = draft) {
    const content = text.trim();
    if ((!content && files.length === 0) || isBusy) return;
    if (!active) return;
    assistant.send(content, files);
    setDraft('');
    setFiles([]);
  }

  // A file is turned into text by the server (audio is heard, a PDF or picture is read); only
  // that text is kept, with the conversation.
  async function addFile(file) {
    if (!file) return;
    setFileState({ isReading: true, error: null });
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await apiRequest('/ai/chat/files', { method: 'POST', body });
      setFiles((current) => [...current, data].slice(0, 5));
      setFileState({ isReading: false, error: null });
    } catch (problem) {
      setFileState({ isReading: false, error: problem.message });
    }
  }

  return (
    <aside
      aria-label="AI assistant"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Sparkles size={16} aria-hidden="true" className="shrink-0 text-brand-text" />
        <h2 className="shrink-0 font-semibold">AI assistant</h2>
        {assistant.chats.length > 0 && (
          <select
            aria-label="Conversations"
            value={active?.id ?? ''}
            onChange={(event) => assistant.selectChat(event.target.value)}
            className={`${compactInputClass} min-w-0 flex-1 py-1 text-sm`}
          >
            {assistant.chats.map((chat) => (
              <option key={chat.id} value={chat.id}>
                {chat.title}
              </option>
            ))}
          </select>
        )}
        <span className="flex-1" />
        <button
          type="button"
          className={iconButton}
          title="New chat"
          aria-label="New chat"
          onClick={assistant.newChat}
        >
          <Plus size={15} aria-hidden="true" />
        </button>
        {active && (
          <button
            type="button"
            className={iconButton}
            title="Delete this chat"
            aria-label="Delete this chat"
            onClick={() => assistant.deleteChat(active.id)}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={iconButton}
          title="Close"
          aria-label="Close the assistant"
          onClick={assistant.close}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </header>

      {!active ? (
        <div className="flex flex-1 flex-col items-start gap-3 p-4">
          <p className="text-text-muted">
            Ask about your leads, companies, people and calls, or add a file (a PDF, a picture, an
            audio recording). The AI sees only the records you attach, and only what you may see.
          </p>
          <button type="button" className={primaryButtonClass} onClick={assistant.newChat}>
            <Plus size={16} aria-hidden="true" />
            New chat
          </button>
          <p className="text-xs text-text-muted">
            Your chats stay in this browser only. They are removed when you sign out, and after 7
            days without use.
          </p>
        </div>
      ) : (
        <>
          {/* What this conversation is about. */}
          <div className="space-y-2 border-b border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {active.records.map((record) => (
                <span
                  key={`${record.type}:${record.id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
                >
                  <span className="text-text-muted">{RECORD_WORDS[record.type]}:</span>
                  <span className="truncate">{record.title}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${record.title}`}
                    className="text-text-muted hover:text-danger"
                    onClick={() => assistant.removeRecord(record)}
                  >
                    <X size={11} aria-hidden="true" />
                  </button>
                </span>
              ))}
              {active.records.length === 0 && (
                <span className="text-xs text-text-muted">No record attached.</span>
              )}
              <button
                type="button"
                aria-expanded={showOptions}
                className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
                onClick={() => setShowOptions(!showOptions)}
              >
                <SlidersHorizontal size={12} aria-hidden="true" />
                Records and style
              </button>
            </div>
            {showOptions && (
              <div className="space-y-2">
                {active.records.length < assistant.maxRecords && (
                  <RecordPicker onPick={assistant.addRecord} />
                )}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">
                    How should the AI answer? (optional)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="For example: in five short points; only the risks; as an email to the customer"
                    value={active.instruction}
                    onChange={(event) => assistant.setInstruction(event.target.value)}
                    className={`${inputClass} text-sm`}
                  />
                </label>
              </div>
            )}
          </div>

          <ol aria-label="Messages" className="flex-1 space-y-2 overflow-y-auto p-3">
            {active.messages.length === 0 && !isBusy && (
              <li className="space-y-2">
                <p className="text-sm text-text-muted">Start with a question, for example:</p>
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:border-text-muted"
                    onClick={() => submit(starter)}
                  >
                    {starter}
                  </button>
                ))}
              </li>
            )}
            {active.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {isBusy && (
              <li role="status" className="text-sm text-text-muted">
                Thinking…
              </li>
            )}
            <li ref={end} aria-hidden="true" />
          </ol>

          <form
            className="space-y-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <FormError message={assistant.error ?? fileState.error} />
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
                  >
                    <Paperclip size={11} aria-hidden="true" />
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      className="text-text-muted hover:text-danger"
                      onClick={() => setFiles(files.filter((item, at) => at !== index))}
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fileState.isReading && (
              <p role="status" className="text-xs text-text-muted">
                Reading the file. An audio file takes a little longer…
              </p>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.csv,.md,.json,image/*,audio/*"
                onChange={(event) => {
                  addFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                className={iconButton}
                title="Add a file: PDF, picture, audio, text or CSV"
                aria-label="Add a file"
                disabled={fileState.isReading || files.length >= 5}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip size={16} aria-hidden="true" />
              </button>
              <textarea
                aria-label="Your question"
                rows={2}
                maxLength={8000}
                placeholder="Ask a question…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends; Shift+Enter makes a new line.
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                className={`${inputClass} text-sm`}
              />
              <button
                type="submit"
                className={`${primaryButtonClass} px-2.5`}
                aria-label="Send"
                disabled={isBusy || fileState.isReading || (!draft.trim() && files.length === 0)}
              >
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-text-muted">AI can be wrong: check before you act.</p>
              <button
                type="button"
                className={`${secondaryButtonClass} px-2 py-0.5 text-xs`}
                onClick={assistant.close}
              >
                Close
              </button>
            </div>
          </form>
        </>
      )}
    </aside>
  );
}
