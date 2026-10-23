import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, KanbanSquare, Sparkles, UserPlus, X } from 'lucide-react';
import { FormError, compactInputClass, inputClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useAccount } from '../../accounts/api.js';
import FormDataCard from '../../accounts/components/FormDataCard.jsx';
import { usePeopleSearch } from '../../calls/api.js';
import { AiBox } from '../../inbox/components/ThreadAiTools.jsx';
import { useLeadOptions } from '../../pipeline/api.js';
import { useChatActions } from '../api.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="break-words">{children || '—'}</dd>
    </div>
  );
}

// Say which person of the CRM this number is (a number that is not in the CRM yet).
function LinkPerson({ chat, link }) {
  const [text, setText] = useState('');
  const people = usePeopleSearch(text.trim());
  return (
    <div className="space-y-2 rounded-md border border-warning p-3">
      <p className="text-sm">
        This number is not saved on any person in the CRM. If you know who it is, choose them: the
        chat and its messages go to that person&apos;s company and timeline.
      </p>
      <input
        type="search"
        aria-label="Find a person"
        placeholder="Name of the person"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={inputClass}
      />
      <ul className="space-y-1 empty:hidden">
        {(people.data ?? []).slice(0, 6).map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{person.name}</span>
              <span className="block truncate text-xs text-text-muted">{person.detail}</span>
            </span>
            <button
              type="button"
              className={smallButton}
              disabled={link.isPending}
              onClick={() => link.mutate(person.id)}
            >
              <UserPlus size={12} aria-hidden="true" />
              This is them
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-muted">
        Not in the CRM at all? Add the company and person in Accounts with the number {chat.phone};
        then open this chat again.
      </p>
      <FormError message={link.error?.message} />
    </div>
  );
}

/**
 * The right side of a chat: who the customer is, their company and lead, who answers the chat,
 * the company's form answers, and the AI's summary of the chat (only on request).
 * @param {{ chat: object, onClose?: () => void }} props
 */
export default function DetailsPanel({ chat, onClose }) {
  const can = useCan();
  const { assign, link, assist } = useChatActions(chat.id);
  const account = useAccount(chat.account?.id);
  const options = useLeadOptions();
  const summary = assist.data?.kind === 'summary' ? assist.data : null;
  const users = options.data?.canAssign ? options.data.users : [];

  return (
    <aside aria-label="Details" className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Details</h2>
        {onClose && (
          <button
            type="button"
            aria-label="Hide the details"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!chat.contact && chat.permissions.canAssign && <LinkPerson chat={chat} link={link} />}
        <dl className="space-y-1.5">
          <Row label="Person">
            {chat.contact
              ? [chat.contact.name, chat.contact.designation].filter(Boolean).join(', ')
              : chat.profileName && `${chat.profileName} (their WhatsApp name)`}
          </Row>
          <Row label="WhatsApp">{chat.phone}</Row>
          <Row label="Email">{chat.contact?.email}</Row>
          <Row label="Agreed">
            {chat.contact &&
              (chat.contact.whatsappOptIn ? (
                <span className="text-success">Agreed to WhatsApp messages</span>
              ) : (
                <span className="text-text-muted">Not marked as agreed</span>
              ))}
          </Row>
          <Row label="Company">
            {chat.account && (
              <Link
                to={`/accounts/${chat.account.id}?tab=people`}
                className="inline-flex items-center gap-1 text-brand-text hover:underline"
              >
                <Building2 size={13} aria-hidden="true" />
                {chat.account.name} · {chat.account.code}
              </Link>
            )}
          </Row>
          <Row label="Lead">
            {chat.lead && (
              <Link
                to={`/pipeline/${chat.lead.id}`}
                className="inline-flex items-center gap-1 text-brand-text hover:underline"
              >
                <KanbanSquare size={13} aria-hidden="true" />
                {chat.lead.code} · {chat.lead.name}
                {chat.lead.stage && ` (${chat.lead.stage.name})`}
              </Link>
            )}
          </Row>
          <Row label="Answered by">
            {chat.permissions.canAssign && users.length > 0 ? (
              <select
                aria-label="Who answers this chat"
                value={chat.assignedTo?.id ?? ''}
                disabled={assign.isPending}
                onChange={(event) => assign.mutate(event.target.value || null)}
                className={compactInputClass}
              >
                <option value="">Nobody yet</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : (
              (chat.assignedTo?.name ?? 'Nobody yet: the first person who answers takes it')
            )}
          </Row>
        </dl>
        <FormError message={assign.error?.message} />

        {account.data && (
          <FormDataCard
            accountId={account.data.id}
            formData={account.data.form_data}
            canEdit={can('accounts', 'edit')}
          />
        )}

        <div className="space-y-2">
          {!summary && (
            <button
              type="button"
              className={smallButton}
              disabled={assist.isPending}
              onClick={() => assist.mutate('summary')}
            >
              <Sparkles size={12} aria-hidden="true" />
              {assist.isPending ? 'The AI is reading the chat…' : 'Summarise this chat (AI)'}
            </button>
          )}
          <FormError message={assist.error?.message} />
          {summary && (
            <AiBox title="Summary of the chat" onClose={() => assist.reset()}>
              {summary.note && <p className="text-text-muted">{summary.note}</p>}
              {summary.result && (
                <>
                  <p>{summary.result.summary}</p>
                  {[
                    ['They asked for', summary.result.customerAsks],
                    ['We promised', summary.result.wePromised],
                    ['Still open', summary.result.openQuestions],
                  ].map(
                    ([title, items]) =>
                      items.length > 0 && (
                        <div key={title}>
                          <p className="font-medium">{title}</p>
                          <ul className="list-disc space-y-0.5 pl-5">
                            {items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ),
                  )}
                  {summary.result.nextStep && (
                    <p>
                      <span className="font-medium">Next step: </span>
                      {summary.result.nextStep}
                    </p>
                  )}
                </>
              )}
            </AiBox>
          )}
        </div>
      </div>
    </aside>
  );
}
