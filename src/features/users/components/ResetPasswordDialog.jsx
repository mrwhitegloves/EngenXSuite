import { useState } from 'react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  FormError,
  fieldErrorsFrom,
  generatePassword,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useResetPassword } from '../api.js';
import PasswordField from './PasswordField.jsx';

// Give a user a new first password. They are signed out everywhere and must replace it.
// The parent renders this with key={user.id}, so every user gets a fresh form and password.
export default function ResetPasswordDialog({ user, onClose }) {
  const [password, setPassword] = useState(generatePassword);
  const reset = useResetPassword();
  const errors = fieldErrorsFrom(reset.error);

  function handleSubmit(event) {
    event.preventDefault();
    reset.mutate({ id: user.id, password }, { onSuccess: onClose });
  }

  return (
    <Dialog
      open
      title={`Reset password: ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="submit"
            form="reset-password-form"
            disabled={password.length < 10 || reset.isPending}
            className={primaryButtonClass}
          >
            {reset.isPending ? 'Saving…' : 'Reset password'}
          </button>
        </>
      }
    >
      <form id="reset-password-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="text-text-muted">
          {user.email} will be signed out on every device. Copy the password and give it to them
          before you close this window; it is not shown again.
        </p>
        <FormError message={errors.password ? null : reset.error?.message} />
        <PasswordField value={password} onChange={setPassword} error={errors.password} />
      </form>
    </Dialog>
  );
}
