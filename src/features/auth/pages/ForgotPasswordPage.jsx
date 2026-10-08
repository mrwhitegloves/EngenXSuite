import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient.js';
import {
  Field,
  FormError,
  inputClass,
  primaryButtonClass,
} from '../../../components/shared/form.jsx';
import AuthCard from '../components/AuthCard.jsx';

// Step 1 of "forgot password": ask for a link by email.
// The page says the same thing whether or not the email belongs to a user.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const request = useMutation({
    mutationFn: () => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  });

  function handleSubmit(event) {
    event.preventDefault();
    request.mutate();
  }

  if (request.isSuccess) {
    return (
      <AuthCard
        title="Check your email"
        description={`If ${email} belongs to a user account, a link to choose a new password has been sent. It works for 30 minutes.`}
      >
        <p className="text-sm text-text-muted">
          No email? Check the spam folder, or ask your administrator or manager to reset your
          password.
        </p>
        <Link to="/" className="text-sm font-medium text-brand-text hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your login email and we will send you a link to choose a new one."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={request.error?.message} />
        <Field label="Email">
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
        <button
          type="submit"
          disabled={!email || request.isPending}
          className={`${primaryButtonClass} w-full`}
        >
          {request.isPending ? 'Sending…' : 'Send link'}
        </button>
      </form>
      <Link to="/" className="block text-sm font-medium text-brand-text hover:underline">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
