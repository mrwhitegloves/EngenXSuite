import { Sparkles } from 'lucide-react';
import { secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useAssistant } from '../assistantContext.js';

/**
 * Opens the AI assistant in a new chat about one record. With `question`, that question is
 * asked at once. Shows nothing for someone who may not use the AI.
 *
 * @param {{ record: { type: 'lead' | 'account' | 'contact' | 'call', id: string, title: string },
 *           question?: string, label?: string, small?: boolean }} props
 */
export default function AskAiButton({ record, question, label = 'Ask AI', small = false }) {
  const can = useCan();
  const assistant = useAssistant();
  if (!can('ai_insights', 'view')) return null;
  return (
    <button
      type="button"
      className={
        small
          ? 'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand'
          : secondaryButtonClass
      }
      onClick={() => assistant.ask({ record, question })}
    >
      <Sparkles size={small ? 12 : 16} aria-hidden="true" />
      {label}
    </button>
  );
}
