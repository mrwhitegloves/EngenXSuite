import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient.js';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
} from '../../../components/shared/form.jsx';
import AuthCard, { PasswordVisibilityNotice } from '../components/AuthCard.jsx';

const MIN_LENGTH = 10;

// Step 2 of "forgot password": the emailed link opens this page with a token in the address.
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reset = useMutation({
    mutationFn: () =>
      apiRequest('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
  });

  const serverErrors = fieldErrorsFrom(reset.error);
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = token && newPassword.length >= MIN_LENGTH && confirmPassword === newPassword;

  function handleSubmit(event) {
    event.preventDefault();
    if (canSubmit) reset.mutate();
  }

  if (reset.isSuccess) {
    return (
      <AuthCard
        title="Password changed"
        description="You have been signed out on every device. Sign in with your new password."
      >
        <Link to="/" className={`${primaryButtonClass} w-full`}>
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard
        title="This link is not complete"
        description="Open the link from the email again, or ask for a new one."
      >
        <Link to="/forgot-password" className="text-sm font-medium text-brand-text hover:underline">
          Ask for a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={Object.keys(serverErrors).length ? null : reset.error?.message} />
        <PasswordVisibilityNotice />
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
        <button
          type="submit"
          disabled={!canSubmit || reset.isPending}
          className={`${primaryButtonClass} w-full`}
        >
          {reset.isPending ? 'Saving…' : 'Save new password'}
        </button>
      </form>
      {reset.isError && (
        <Link
          to="/forgot-password"
          className="block text-sm font-medium text-brand-text hover:underline"
        >
          Ask for a new link
        </Link>
      )}
    </AuthCard>
  );
}
