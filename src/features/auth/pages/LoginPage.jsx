import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient.js';
import { CURRENT_USER_KEY } from '../../../hooks/useAuth.js';
import Logo from '../../../components/shared/Logo.jsx';
import {
  Field,
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';

// The sign-in page: black brand panel, white panel with the two ways in:
// email + password (accounts created inside the CRM), or Google.

const GOOGLE_MESSAGES = {
  not_invited:
    'This Google account does not have access. Ask your administrator to create an account for you.',
  failed: 'Google sign-in did not complete. Please try again.',
};

function readGoogleMessage() {
  const reason = new URLSearchParams(window.location.search).get('signin');
  return GOOGLE_MESSAGES[reason] ?? null;
}

export default function LoginPage({ productName }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
    onSuccess: (payload) => queryClient.setQueryData(CURRENT_USER_KEY, payload.data),
  });

  function handleSubmit(event) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="flex flex-col justify-between bg-sidebar p-8 text-on-sidebar md:p-12">
        <div>
          <Logo productName={productName} background="dark" className="h-9" />
          <p className="mt-3 text-sm font-medium tracking-wide opacity-80">{productName}</p>
        </div>
        <div>
          <div className="mb-4 h-1 w-12 bg-brand" aria-hidden="true" />
          <p className="max-w-sm text-2xl font-semibold leading-snug">
            Accounts, plants, stakeholders and deals in one place.
          </p>
        </div>
        <p className="text-sm opacity-60">Internal use only</p>
      </aside>

      <main className="flex items-center justify-center bg-surface p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-text-muted">Use the login details your administrator gave you.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <FormError message={login.error?.message ?? readGoogleMessage()} />
            <Field label="Email">
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Password">
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-brand-text hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={login.isPending || !email || !password}
              className={`${primaryButtonClass} w-full`}
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* A normal link, not a fetch: the browser has to leave the page to reach Google. */}
          <a href="/api/auth/google" className={`${secondaryButtonClass} w-full`}>
            Sign in with Google
          </a>

          <p className="mt-6 text-sm text-text-muted">
            No account? Ask your administrator or manager to create one for you.
          </p>
        </div>
      </main>
    </div>
  );
}
