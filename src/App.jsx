import { useAuth } from './hooks/useAuth.js';
import { useBranding } from './hooks/useBranding.js';
import { useTheme } from './hooks/useTheme.js';
import LoginPage from './features/auth/pages/LoginPage.jsx';

// Decides what to show from the sign-in state. The signed-in view below is a temporary
// placeholder; the real app shell (sidebar, top bar, routes) replaces it in the next task.
export default function App() {
  const { status, user, error, signOut } = useAuth();
  const { productName } = useBranding();
  const { theme, setTheme, themes } = useTheme();

  if (status === 'loading') {
    return (
      <p className="p-8 text-text-muted" role="status">
        Loading…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-8">
        <p className="text-danger" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === 'signedOut') return <LoginPage productName={productName} />;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{productName}</h1>
        <label className="flex items-center gap-2 text-text-muted">
          Theme
          <select
            className="rounded-md border border-border bg-surface px-2 py-1 text-text"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            {themes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="font-medium">Signed in as {user.name}</p>
        <p className="text-text-muted">
          {user.email} · {user.role.name}
        </p>
        <p className="mt-2 text-text-muted">{user.grants.length} permissions loaded</p>
      </section>

      <button
        type="button"
        className="self-start rounded-md border border-border bg-surface px-4 py-2 font-medium transition-colors hover:border-brand"
        onClick={signOut}
      >
        Sign out
      </button>
    </main>
  );
}
