import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Megaphone,
  Reply,
} from 'lucide-react';
import { TYPE_LABELS, fileSize, messageTime, renderWhatsAppText } from '../waFormat.jsx';

// How far a message of ours got: ✓ sent, ✓✓ delivered, blue ✓✓ read, a clock while waiting,
// red ! when it failed (the reason on hover).
function Ticks({ message }) {
  if (message.status === 'failed') {
    return (
      <span title={message.error ?? 'Not sent'} className="inline-flex text-danger">
        <AlertCircle size={14} aria-label={`Not sent: ${message.error ?? 'no reason given'}`} />
      </span>
    );
  }
  if (message.status === 'read')
    return <CheckCheck size={14} className="text-chat-read" aria-label="Read" />;
  if (message.status === 'delivered') return <CheckCheck size={14} aria-label="Delivered" />;
  if (message.status === 'sent') return <Check size={14} aria-label="Sent" />;
  return <Clock size={13} aria-label="Waiting" />;
}

// The quoted message at the top of a reply. A click jumps to it.
function Quote({ reply, onJumpTo }) {
  return (
    <button
      type="button"
      onClick={() => onJumpTo(reply.id)}
      className="mb-1 block w-full rounded border-l-4 border-success bg-page/70 px-2 py-1 text-left text-xs hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="block font-semibold text-success">
        {reply.direction === 'inbound' ? 'Customer' : 'You'}
      </span>
      <span className="line-clamp-2 text-text-muted">
        {reply.text
          ? renderWhatsAppText(reply.text, `q-${reply.id}`)
          : reply.fileName || TYPE_LABELS[reply.type] || 'Message'}
      </span>
    </button>
  );
}

// The file of a message, by its kind.
function Media({ message, onOpenImage }) {
  const media = message.media;
  if (media.status === 'pending') {
    return (
      <p className="flex items-center gap-2 py-2 text-sm text-text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Saving file…
      </p>
    );
  }
  if (media.status === 'failed' || !media.url) {
    return (
      <p className="flex items-center gap-2 py-2 text-sm text-text-muted">
        <AlertCircle size={16} aria-hidden="true" />
        File not available
      </p>
    );
  }
  const isImage =
    message.type === 'image' ||
    (message.type === 'template' && media.mimeType?.startsWith('image/'));
  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => onOpenImage(message)}
        className="block overflow-hidden rounded focus-visible:outline-2 focus-visible:outline-brand"
      >
        <img
          src={media.url}
          alt={message.text || media.fileName || 'Photo'}
          loading="lazy"
          className="max-h-72 w-auto max-w-full rounded object-contain"
        />
      </button>
    );
  }
  if (message.type === 'sticker') {
    return (
      <img src={media.url} alt="Sticker" loading="lazy" className="h-28 w-28 object-contain" />
    );
  }
  if (message.type === 'video' || media.mimeType?.startsWith('video/')) {
    // A customer's video and a voice message come without captions.
    return (
      <video src={media.url} controls preload="metadata" className="max-h-72 max-w-full rounded" />
    );
  }
  if (message.type === 'audio') {
    return <audio src={media.url} controls preload="metadata" className="max-w-full" />;
  }
  return (
    <div className="flex items-center gap-2 rounded border border-border bg-surface/60 p-2">
      <FileText size={28} aria-hidden="true" className="shrink-0 text-text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{media.fileName ?? 'Document'}</span>
        <span className="block text-xs text-text-muted">{fileSize(media.size)}</span>
      </span>
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${media.fileName ?? 'the document'}`}
        className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ExternalLink size={16} aria-hidden="true" />
      </a>
      <a
        href={media.url}
        download={media.fileName ?? true}
        aria-label={`Download ${media.fileName ?? 'the document'}`}
        className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Download size={16} aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * One message, WhatsApp style: the customer's on the left, ours on the right in green, with
 * who sent it, the time and the ticks.
 * @param {{ message: object, isHighlighted: boolean, canReply: boolean,
 *           onReply: (message: object) => void, onJumpTo: (id: string) => void,
 *           onOpenImage: (message: object) => void }} props
 */
export default function ChatBubble({
  message,
  isHighlighted,
  canReply,
  onReply,
  onJumpTo,
  onOpenImage,
}) {
  const isOurs = message.direction === 'outbound';
  if (message.type === 'reaction') {
    return (
      <div id={`wa-${message.id}`} className={`flex ${isOurs ? 'justify-end' : 'justify-start'}`}>
        <span
          className="rounded-full border border-border bg-surface px-2 py-0.5 text-sm"
          aria-label={`Reacted ${message.reaction?.emoji ?? ''}`}
        >
          {message.reaction?.emoji}{' '}
          <span className="text-xs text-text-muted">{messageTime(message.sentAt)}</span>
        </span>
      </div>
    );
  }
  const hasMedia = Boolean(message.media);
  const text = message.text;
  return (
    <div
      id={`wa-${message.id}`}
      className={`group flex items-end gap-1 ${isOurs ? 'justify-end' : 'justify-start'}`}
    >
      {isOurs && canReply && message.canReply && <ReplyButton onClick={() => onReply(message)} />}
      <div
        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 shadow-sm transition-shadow sm:max-w-[70%] ${
          isOurs ? 'bg-chat-out' : 'bg-chat-in'
        } ${message.status === 'failed' ? 'ring-2 ring-danger' : ''} ${
          isHighlighted ? 'ring-4 ring-warning' : ''
        }`}
      >
        {isOurs && (message.sentBy || message.templateName) && (
          <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-success">
            {message.templateName && <Megaphone size={12} aria-hidden="true" />}
            {message.sentBy ?? 'Bulk sending'}
            {message.templateName && (
              <span className="font-normal text-text-muted">· {message.templateName}</span>
            )}
          </p>
        )}
        {message.replyTo && <Quote reply={message.replyTo} onJumpTo={onJumpTo} />}
        {hasMedia && <Media message={message} onOpenImage={onOpenImage} />}
        {message.type === 'location' && (
          <p className="flex items-start gap-1 text-sm">
            <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
            {message.location?.latitude != null ? (
              <a
                href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-info underline"
              >
                {text || 'Open the location'}
              </a>
            ) : (
              text
            )}
          </p>
        )}
        {text && message.type !== 'location' && (
          <p className={`text-sm break-words whitespace-pre-wrap ${hasMedia ? 'mt-1' : ''}`}>
            {renderWhatsAppText(text, message.id)}
          </p>
        )}
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-text-muted">
          {messageTime(message.sentAt)}
          {isOurs && <Ticks message={message} />}
        </p>
        {message.status === 'failed' && message.error && (
          <p className="mt-0.5 text-xs text-danger">{message.error}</p>
        )}
      </div>
      {!isOurs && canReply && message.canReply && <ReplyButton onClick={() => onReply(message)} />}
    </div>
  );
}

function ReplyButton({ onClick }) {
  return (
    <button
      type="button"
      aria-label="Reply to this message"
      onClick={onClick}
      className="mb-2 rounded-full p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-text focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <Reply size={14} aria-hidden="true" />
    </button>
  );
}
