import { useState } from 'react';
import { Link } from 'react-router-dom';
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

// "Forgot password" (decision 0011): enter the login email and a new password twice.
// No email is sent and the old password is not asked. The email must belong to a user.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reset = useMutation({
    mutationFn: () =>
      apiRequest('/auth/reset-password', { method: 'POST', body: { email, newPassword } }),
  });

  const serverErrors = fieldErrorsFrom(reset.error);
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = email && newPassword.length >= MIN_LENGTH && confirmPassword === newPassword;

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

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your login email and choose a new password."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={Object.keys(serverErrors).length ? null : reset.error?.message} />
        <Field label="Email" error={serverErrors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
        <PasswordVisibilityNotice />
        <button
          type="submit"
          disabled={!canSubmit || reset.isPending}
          className={`${primaryButtonClass} w-full`}
        >
          {reset.isPending ? 'Saving…' : 'Save new password'}
        </button>
      </form>
      <Link to="/" className="block text-sm font-medium text-brand-text hover:underline">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
