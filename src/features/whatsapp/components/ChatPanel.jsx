import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Info, Loader2 } from 'lucide-react';
import Avatar from '../../../components/shared/Avatar.jsx';
import { FormError } from '../../../components/shared/form.jsx';
import { fetchOlderMessages, useChatActions, useConversation } from '../api.js';
import { dayLabel, isSameDay, windowLeft } from '../waFormat.jsx';
import ChatBubble from './ChatBubble.jsx';
import Composer, { checkFile } from './Composer.jsx';
import ImageViewer from './ImageViewer.jsx';
import SuggestPanel from './SuggestPanel.jsx';
import TemplateDialog from './TemplateDialog.jsx';

// A new message scrolls the chat down only when the person is reading near the bottom.
const NEAR_BOTTOM_PX = 120;
const HIGHLIGHT_MS = 1500;

function WindowStatus({ chat }) {
  const left = windowLeft(chat.windowClosesAt);
  if (chat.optedOut) return <span className="text-danger">Opted out</span>;
  return left ? (
    <span className="inline-flex items-center gap-1 text-success">
      <Clock size={12} aria-hidden="true" />
      Can reply for {left}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-warning">
      <Clock size={12} aria-hidden="true" />
      24 h window closed: send a template
    </span>
  );
}

/**
 * One open chat: header, messages and the message box. Rendered with key={conversationId}, so
 * switching chats starts fresh.
 * @param {{ conversationId: string, onBack: () => void, isDetailsOpen: boolean,
 *           onToggleDetails: () => void }} props
 */
export default function ChatPanel({ conversationId, onBack, isDetailsOpen, onToggleDetails }) {
  const conversation = useConversation(conversationId);
  const actions = useChatActions(conversationId);
  const { sendText, sendFile, sendDocument } = actions;
  const scrollerRef = useRef(null);
  const wasNearBottom = useRef(true);
  const keepFrom = useRef(null);
  const [older, setOlder] = useState({ messages: [], hasMore: null, isLoading: false });
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [problem, setProblem] = useState('');
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [viewerId, setViewerId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const chat = conversation.data;
  const latest = chat?.messages ?? [];
  const seen = new Set(latest.map((message) => message.id));
  const messages = [...older.messages.filter((message) => !seen.has(message.id)), ...latest];
  const hasMore = older.hasMore ?? chat?.hasMore ?? false;
  const lastId = messages.at(-1)?.id;
  const canDrop = chat && chat.isWindowOpen && !chat.optedOut && chat.permissions.canSend;

  // Down to the newest message on opening, and when a new one comes while near the bottom.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (keepFrom.current !== null) {
      // Older messages were added above: keep what the person was looking at in place.
      scroller.scrollTop = scroller.scrollHeight - keepFrom.current;
      keepFrom.current = null;
      return;
    }
    if (wasNearBottom.current) scroller.scrollTop = scroller.scrollHeight;
  }, [lastId, older.messages.length]);

  useEffect(() => {
    if (!highlightId) return undefined;
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightId]);

  if (conversation.isPending) {
    return <p className="p-6 text-text-muted">Loading the chat…</p>;
  }
  if (conversation.isError) {
    return (
      <div className="p-6">
        <FormError message={conversation.error.message} />
      </div>
    );
  }

  const loadOlder = async () => {
    const scroller = scrollerRef.current;
    setOlder((current) => ({ ...current, isLoading: true }));
    try {
      const page = await fetchOlderMessages(conversationId, messages[0].sentAt);
      keepFrom.current = scroller ? scroller.scrollHeight - scroller.scrollTop : null;
      setOlder((current) => ({
        messages: [...page.messages, ...current.messages],
        hasMore: page.hasMore,
        isLoading: false,
      }));
    } catch (error) {
      setProblem(error.message);
      setOlder((current) => ({ ...current, isLoading: false }));
    }
  };

  const afterSend = {
    onSuccess: () => {
      setText('');
      setFile(null);
      setReplyTo(null);
      setIsSuggesting(false);
      wasNearBottom.current = true;
    },
    onError: (error) => {
      if (error.code === 'WHATSAPP_WINDOW_CLOSED') setIsTemplateOpen(true);
      setProblem(error.message);
    },
  };
  const send = () => {
    setProblem('');
    const replyToId = replyTo?.id;
    if (file) sendFile.mutate({ file, caption: text.trim(), replyToId }, afterSend);
    else sendText.mutate({ text: text.trim(), ...(replyToId ? { replyToId } : {}) }, afterSend);
  };
  const jumpTo = (id) => {
    const element = document.getElementById(`wa-${id}`);
    if (!element) {
      setProblem('That message is further up: press "Load older messages".');
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
  };
  const images = messages
    .filter((message) => message.media?.url && message.media.mimeType?.startsWith('image/'))
    .map((message) => ({
      id: message.id,
      url: message.media.url,
      caption: message.text,
      fileName: message.media.fileName,
    }));

  return (
    <section
      aria-label={`Chat with ${chat.name}`}
      className="relative flex h-full min-h-0 flex-col bg-page"
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
      }}
      onDrop={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        setIsDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (!dropped) return;
        const tooBig = checkFile(dropped);
        if (tooBig) setProblem(tooBig);
        else setFile(dropped);
      }}
    >
      <header className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2">
        <button
          type="button"
          aria-label="Back to the chats"
          onClick={onBack}
          className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand lg:hidden"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <Avatar name={chat.name} size="md" />
        <div className="min-w-0 flex-1">
          {chat.account ? (
            <Link
              to={`/accounts/${chat.account.id}?tab=people`}
              className="block truncate font-semibold hover:underline"
            >
              {chat.name}
            </Link>
          ) : (
            <p className="truncate font-semibold">{chat.name}</p>
          )}
          <p className="truncate text-xs text-text-muted">
            {[chat.phone, chat.account?.name, chat.lead?.code].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs">
            <WindowStatus chat={chat} />
          </p>
        </div>
        <button
          type="button"
          aria-label={isDetailsOpen ? 'Hide the details' : 'Show the details'}
          aria-pressed={isDetailsOpen}
          onClick={onToggleDetails}
          className="rounded p-1.5 text-text-muted hover:bg-page hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Info size={20} aria-hidden="true" />
        </button>
      </header>

      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const box = event.currentTarget;
          wasNearBottom.current =
            box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM_PX;
        }}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-6"
      >
        {hasMore && (
          <div className="mb-2 text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={older.isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand"
            >
              {older.isLoading && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
              Load older messages
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="mx-auto mt-8 max-w-sm rounded-lg bg-surface p-4 text-center text-sm text-text-muted">
            No messages yet. Start with an approved template: WhatsApp does not let a business write
            first with a plain message.
          </p>
        )}
        {messages.map((message, index) => (
          <div key={message.id}>
            {(index === 0 || !isSameDay(messages[index - 1].sentAt, message.sentAt)) && (
              <p className="my-2 text-center">
                <span className="rounded-full bg-surface px-3 py-0.5 text-xs text-text-muted shadow-sm">
                  {dayLabel(message.sentAt)}
                </span>
              </p>
            )}
            <ChatBubble
              message={message}
              isHighlighted={highlightId === message.id}
              canReply={canDrop}
              onReply={(target) => setReplyTo(target)}
              onJumpTo={jumpTo}
              onOpenImage={(target) => setViewerId(target.id)}
            />
          </div>
        ))}
      </div>

      {problem && (
        <div className="border-t border-border bg-surface px-3 pt-2">
          <FormError message={problem} />
        </div>
      )}
      {isSuggesting && (
        <SuggestPanel
          assist={actions.assist}
          onUse={(suggested) => setText(suggested)}
          onClose={() => setIsSuggesting(false)}
        />
      )}
      <Composer
        chat={chat}
        text={text}
        onTextChange={setText}
        file={file}
        onFileChange={setFile}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={send}
        onSendDocument={(picked) => {
          setProblem('');
          sendDocument.mutate(
            {
              documentId: picked.id,
              ...(text.trim() ? { caption: text.trim() } : {}),
              ...(replyTo ? { replyToId: replyTo.id } : {}),
            },
            afterSend,
          );
        }}
        isSending={sendText.isPending || sendFile.isPending || sendDocument.isPending}
        onOpenTemplates={() => setIsTemplateOpen(true)}
        onSuggest={() => {
          setIsSuggesting(true);
          if (!actions.assist.data && !actions.assist.isPending) actions.assist.mutate('suggest');
        }}
        onProblem={setProblem}
      />

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface/80 text-lg font-semibold">
          Drop the file to send it
        </div>
      )}
      <TemplateDialog
        open={isTemplateOpen}
        conversation={chat}
        actions={actions}
        onClose={() => setIsTemplateOpen(false)}
      />
      {viewerId && (
        <ImageViewer images={images} startId={viewerId} onClose={() => setViewerId(null)} />
      )}
    </section>
  );
}
