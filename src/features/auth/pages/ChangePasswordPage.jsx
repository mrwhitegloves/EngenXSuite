import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient.js';
import { CURRENT_USER_KEY, useAuth } from '../../../hooks/useAuth.js';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';

const MIN_LENGTH = 10;

// Shown instead of the app while the user still has the password someone else gave them
// (a new account, or after a reset). Nothing else is reachable until they choose their own.
export default function ChangePasswordPage() {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const change = useMutation({
    mutationFn: () =>
      apiRequest('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
    onSuccess: (payload) => queryClient.setQueryData(CURRENT_USER_KEY, payload.data),
  });

  const serverErrors = fieldErrorsFrom(change.error);
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit =
    currentPassword && newPassword.length >= MIN_LENGTH && confirmPassword === newPassword;

  function handleSubmit(event) {
    event.preventDefault();
    if (canSubmit) change.mutate();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6"
      >
        <div>
          <h1 className="text-xl font-semibold">Choose your own password</h1>
          <p className="mt-1 text-text-muted">
            {user.email} is using a password set by someone else. Replace it to continue.
          </p>
        </div>

        <FormError message={Object.keys(serverErrors).length ? null : change.error?.message} />

        <Field label="Current password" hint="The one you were given.">
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field
          label="New password"
          hint={`At least ${MIN_LENGTH} characters.`}
          error={(tooShort && `Use at least ${MIN_LENGTH} characters`) || serverErrors.newPassword}
        >
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Repeat new password" error={mismatch && 'The two passwords do not match'}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>

        <div className="flex justify-between gap-2 pt-2">
          <button type="button" onClick={() => signOut()} className={secondaryButtonClass}>
            Sign out
          </button>
          <button
            type="submit"
            disabled={!canSubmit || change.isPending}
            className={primaryButtonClass}
          >
            {change.isPending ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </form>
    </main>
  );
}
