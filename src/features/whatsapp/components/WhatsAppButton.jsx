import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCan } from '../../../hooks/useCan.js';
import { useStartChat } from '../api.js';

const buttonClass =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-success hover:text-success disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

/**
 * THE way to open a WhatsApp chat with a person of a company (beside the Call button). It opens
 * the chat on the WhatsApp screen, making it first when there is none; a new chat starts with
 * a template. Shows nothing for someone without WhatsApp, or a person without a phone number.
 * @param {{ contact: { id: string, name: string, phone_number?: string } }} props
 */
export default function WhatsAppButton({ contact }) {
  const can = useCan();
  const navigate = useNavigate();
  const start = useStartChat();
  if (!can('whatsapp', 'view') || !contact.phone_number) return null;
  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-label={`WhatsApp ${contact.name}`}
        title={start.error?.message}
        disabled={start.isPending}
        onClick={() =>
          start.mutate(contact.id, {
            onSuccess: (payload) => navigate(`/whatsapp/${payload.data.conversationId}`),
          })
        }
      >
        <MessageCircle size={14} aria-hidden="true" />
        WhatsApp
      </button>
      {start.error && (
        <span role="alert" className="text-xs text-danger">
          {start.error.message}
        </span>
      )}
    </>
  );
}
