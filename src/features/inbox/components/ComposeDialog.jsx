import Dialog from '../../../components/shared/Dialog.jsx';
import { useAccountContacts } from '../../accounts/api.js';
import MailComposer from './MailComposer.jsx';

// The people of the company are loaded only when the mail is for a company.
function ForCompany({ account, initialTo, onClose }) {
  const contacts = useAccountContacts(account.id);
  return (
    <MailComposer
      account={account}
      contacts={contacts.data ?? []}
      initialTo={initialTo}
      rows={9}
      onSent={onClose}
    />
  );
}

/**
 * A new mail, as a new conversation, from my own mailbox.
 * @param {{ account?: { id: string, name: string }, initialTo?: string, onClose: () => void }} props
 *        account: the company it is for (then its people, its files and the AI are offered)
 */
export default function ComposeDialog({ account, initialTo = '', onClose }) {
  return (
    <Dialog
      open
      wide
      title={account ? `New mail to ${account.name}` : 'New mail'}
      onClose={onClose}
    >
      {account ? (
        <ForCompany account={account} initialTo={initialTo} onClose={onClose} />
      ) : (
        <>
          <MailComposer initialTo={initialTo} rows={9} onSent={onClose} />
          <p className="mt-2 text-xs text-text-muted">
            For the AI’s help and a company’s earlier files, write from the “Mail” tab of the
            company.
          </p>
        </>
      )}
    </Dialog>
  );
}
