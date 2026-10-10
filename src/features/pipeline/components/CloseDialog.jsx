import { useState } from 'react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';

/**
 * Won and lost need a reason: this dialog asks for it, then changes the stage.
 * Used wherever a stage is changed outside the lead form (table row, board, stage bar).
 *
 * @param {{ lead: { id: string, name: string }, stage: { id: string, name: string, type: string },
 *           move: object, via: string, onClose: () => void }} props
 *        move: the mutation from useChangeStage(); via: where the change is made
 */
export default function CloseDialog({ lead, stage, move, via, onClose }) {
  const [closeReason, setCloseReason] = useState('');
  const [lostToCompetitor, setLostToCompetitor] = useState('');
  const isWon = stage.type === 'won';
  return (
    <Dialog open title={`Mark “${lead.name}” as ${stage.name}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          move.mutate(
            {
              id: lead.id,
              stageId: stage.id,
              closeReason: closeReason.trim(),
              ...(lostToCompetitor.trim() ? { lostToCompetitor: lostToCompetitor.trim() } : {}),
              via,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label={isWon ? 'Why was it won?' : 'Why was it lost?'}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              maxLength={500}
              autoFocus
              value={closeReason}
              onChange={(event) => setCloseReason(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        {!isWon && (
          <Field label="Lost to (competitor)" hint="Leave empty when not known.">
            {(props) => (
              <input
                {...props}
                value={lostToCompetitor}
                maxLength={200}
                onChange={(event) => setLostToCompetitor(event.target.value)}
                className={inputClass}
              />
            )}
          </Field>
        )}
        <FormError message={move.error?.message} />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!closeReason.trim() || move.isPending}
          >
            {move.isPending ? 'Saving…' : `Mark as ${stage.name}`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
