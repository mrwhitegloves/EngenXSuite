import { useLayoutEffect, useRef, useState } from 'react';
import {
  Ban,
  FileText,
  FolderOpen,
  Lightbulb,
  Loader2,
  Megaphone,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { useCan } from '../../../hooks/useCan.js';
import DocumentPicker from '../../documents/components/DocumentPicker.jsx';
import {
  ACCEPTED_FILES,
  MAX_FILE_BYTES,
  TYPE_LABELS,
  fileSize,
  htmlToWhatsApp,
} from '../waFormat.jsx';

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 160;
const toolButton =
  'inline-flex shrink-0 items-center gap-1 rounded-full p-2 text-text-muted hover:bg-page hover:text-text disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand';

/** A file is checked against the largest WhatsApp size here; the server checks the exact limit. */
export function checkFile(file) {
  if (file.size > MAX_FILE_BYTES) return 'File is larger than 25 MB.';
  return null;
}

/**
 * The box at the bottom of a chat. Enter sends, Shift + Enter makes a new line, Escape drops the
 * quoted message. A pasted screenshot or file is attached; pasted formatted text keeps its bold,
 * italic and lists as WhatsApp marks (*bold*, _italic_, • item).
 *
 * @param {{ chat: object, text: string, onTextChange: (text: string) => void,
 *           file: File | null, onFileChange: (file: File | null) => void,
 *           replyTo: object | null, onCancelReply: () => void,
 *           onSend: () => void, onSendDocument: (document: object) => void, isSending: boolean,
 *           onOpenTemplates: () => void, onSuggest: () => void, onProblem: (text: string) => void }} props
 */
export default function Composer({
  chat,
  text,
  onTextChange,
  file,
  onFileChange,
  replyTo,
  onCancelReply,
  onSend,
  onSendDocument,
  isSending,
  onOpenTemplates,
  onSuggest,
  onProblem,
}) {
  const can = useCan();
  const boxRef = useRef(null);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  const canWrite = chat.permissions.canSend;

  // The box grows with its text from 40 to 160 pixels, then scrolls inside.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, box.scrollHeight))}px`;
  }, [text]);

  const attach = (picked) => {
    if (!picked) return;
    const problem = checkFile(picked);
    if (problem) onProblem(problem);
    else onFileChange(picked);
  };

  const insertAtCursor = (inserted) => {
    const box = boxRef.current;
    const start = box?.selectionStart ?? text.length;
    const end = box?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${inserted}${text.slice(end)}`;
    onTextChange(next.slice(0, 4096));
    requestAnimationFrame(() => {
      if (!box) return;
      const cursor = Math.min(4096, start + inserted.length);
      box.setSelectionRange(cursor, cursor);
    });
  };

  if (chat.optedOut) {
    return (
      <p className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 text-sm text-danger">
        <Ban size={16} aria-hidden="true" />
        This person opted out of WhatsApp messages. Please call them instead.
      </p>
    );
  }
  if (!canWrite) {
    return (
      <p className="border-t border-border bg-surface px-4 py-3 text-sm text-text-muted">
        You can read this chat but not write in it.
      </p>
    );
  }
  if (!chat.isWindowOpen) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-4 py-3 text-sm">
        <p className="text-text-muted">
          {chat.windowClosesAt
            ? 'More than 24 hours since their last message: WhatsApp allows only an approved template now.'
            : 'They have not written to us yet: WhatsApp allows only an approved template to start.'}
        </p>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Megaphone size={16} aria-hidden="true" />
          Send template
        </button>
      </div>
    );
  }

  const canSend = (text.trim() || file) && !isSending;
  return (
    <div className="border-t border-border bg-surface px-2 py-2 sm:px-3">
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-md border-l-4 border-success bg-page px-2 py-1 text-xs">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-success">
              Replying to {replyTo.direction === 'inbound' ? 'the customer' : 'our message'}
            </span>
            <span className="line-clamp-1 text-text-muted">
              {replyTo.text || replyTo.media?.fileName || TYPE_LABELS[replyTo.type]}
            </span>
          </span>
          <button
            type="button"
            aria-label="Do not reply to this message"
            onClick={onCancelReply}
            className="rounded p-0.5 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-page px-2 py-1.5 text-sm">
          <FileText size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{file.name}</span>
            <span className="text-text-muted">
              {' '}
              · {fileSize(file.size)}: add a caption below (optional)
            </span>
          </span>
          <button
            type="button"
            aria-label="Remove the file"
            onClick={() => onFileChange(null)}
            className="rounded p-0.5 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {isPickingDocument && (
        <div className="mb-2 max-h-60 overflow-y-auto rounded-md border border-border bg-page p-2">
          <DocumentPicker
            chosen={[]}
            onPick={(document) => {
              setIsPickingDocument(false);
              onSendDocument(document);
            }}
          />
        </div>
      )}
      <div className="flex items-end gap-1">
        <label className={`${toolButton} cursor-pointer`} title="Attach a file">
          <Paperclip size={18} aria-hidden="true" />
          <span className="sr-only">Attach a file</span>
          <input
            type="file"
            accept={ACCEPTED_FILES}
            className="sr-only"
            onChange={(event) => {
              attach(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        {can('documents', 'view') && (
          <button
            type="button"
            className={toolButton}
            title="Send a document from Documents"
            aria-label="Send a document from Documents"
            aria-pressed={isPickingDocument}
            onClick={() => setIsPickingDocument((value) => !value)}
          >
            <FolderOpen size={18} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={toolButton}
          title="Send a template"
          aria-label="Send a template"
          onClick={onOpenTemplates}
        >
          <Megaphone size={18} aria-hidden="true" />
        </button>
        <textarea
          ref={boxRef}
          aria-label="Message"
          rows={1}
          value={text}
          maxLength={4096}
          placeholder={file ? 'Add a caption (optional)' : 'Type a message'}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && replyTo) {
              event.preventDefault();
              onCancelReply();
            }
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
          onPaste={(event) => {
            const data = event.clipboardData;
            const pastedFile = [...(data?.files ?? [])][0];
            if (pastedFile) {
              event.preventDefault();
              attach(pastedFile);
              return;
            }
            const html = data?.getData('text/html');
            if (html) {
              event.preventDefault();
              insertAtCursor(htmlToWhatsApp(html));
            }
          }}
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
          className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-page px-3 py-2 text-sm leading-5 text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-brand"
        />
        <button
          type="button"
          className={toolButton}
          title="What should I say? (AI)"
          aria-label="What should I say? (AI)"
          onClick={onSuggest}
        >
          <Lightbulb size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Send"
          disabled={!canSend}
          onClick={onSend}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-surface hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
