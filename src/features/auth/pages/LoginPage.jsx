// The sign-in page: black brand panel, white panel with the single way in (Google).
// There are no passwords in this product.

const SIGN_IN_MESSAGES = {
  not_invited:
    'This Google account does not have access. Ask your administrator to invite you, then try again.',
  failed: 'Sign-in did not complete. Please try again.',
};

function readSignInMessage() {
  const reason = new URLSearchParams(window.location.search).get('signin');
  return SIGN_IN_MESSAGES[reason] ?? null;
}

export default function LoginPage({ productName }) {
  const message = readSignInMessage();

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="flex flex-col justify-between bg-sidebar p-8 text-on-sidebar md:p-12">
        <p className="text-lg font-semibold tracking-wide">{productName}</p>
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
          <p className="mt-2 text-text-muted">Use the Google account you were invited with.</p>

          {message && (
            <p
              role="alert"
              className="mt-6 rounded-md border border-danger px-3 py-2 text-sm text-danger"
            >
              {message}
            </p>
          )}

          {/* A normal link, not a fetch: the browser has to leave the page to reach Google. */}
          <a
            href="/api/auth/google"
            className="mt-6 flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 font-medium text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Sign in with Google
          </a>

          <p className="mt-6 text-sm text-text-muted">
            No account? Access is by invitation from your administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
