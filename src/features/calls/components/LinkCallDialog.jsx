import { useState } from 'react';
import Dialog from '../../../components/shared/Dialog.jsx';
import { FormError, inputClass, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useLinkCall, usePeopleSearch } from '../api.js';

/**
 * Says who a call was with: search for a person and choose them. The call, its lead and its
 * timeline entry move to that person. Used for calls from unknown numbers and for a wrong match.
 *
 * @param {{ call: { id: string, number: string, contact: { name: string } | null },
 *           onClose: () => void }} props
 */
export default function LinkCallDialog({ call, onClose }) {
  const [text, setText] = useState('');
  const people = usePeopleSearch(text.trim());
  const link = useLinkCall();
  const choose = (contactId) => link.mutate({ id: call.id, contactId }, { onSuccess: onClose });

  return (
    <Dialog
      open
      title={`Who was the call with ${call.number}?`}
      onClose={onClose}
      footer={
        <>
          {call.contact && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={link.isPending}
              onClick={() => choose(null)}
            >
              Not {call.contact.name}: take it off
            </button>
          )}
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          type="search"
          aria-label="Search for a person"
          placeholder="Name, phone or email of the person"
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={inputClass}
        />
        <FormError message={people.error?.message ?? link.error?.message} />
        {text.trim().length < 2 && (
          <p className="text-sm text-text-muted">
            Type at least 2 letters. Someone new? Add them to their company first.
          </p>
        )}
        {people.isSuccess && people.data.length === 0 && (
          <p className="text-sm text-text-muted">Nobody matches.</p>
        )}
        {people.data?.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {people.data.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={link.isPending}
                  onClick={() => choose(person.id)}
                  className="block w-full px-3 py-2 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
                >
                  <span className="font-medium">{person.name}</span>
                  {person.detail && (
                    <span className="block text-sm text-text-muted">{person.detail}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
