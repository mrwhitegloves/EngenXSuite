import { useEffect, useState } from 'react';
import { apiRequest } from './lib/apiClient.js';
import { useTheme } from './hooks/useTheme.js';

// Temporary start page for the scaffold. It proves three things end to end:
// the client reaches the API, the design tokens work, and light / dark switching works.
// It is replaced by the login page and the app shell in the next Phase 01 tasks.
export default function App() {
  const { theme, setTheme, themes } = useTheme();
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/health', { signal: controller.signal })
      .then((payload) => setHealth({ state: 'ready', data: payload.data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setHealth({ state: 'error', message: error.message });
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Foundation check</h1>
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
        <h2 className="mb-2 font-medium">API status</h2>
        {health.state === 'loading' && <p className="text-text-muted">Checking…</p>}
        {health.state === 'error' && <p className="text-danger">{health.message}</p>}
        {health.state === 'ready' && (
          <ul className="space-y-1">
            <li>
              Server: <span className="text-success">up</span>
            </li>
            <li>
              Database:{' '}
              <span
                className={health.data.components.mongo === 'up' ? 'text-success' : 'text-danger'}
              >
                {health.data.components.mongo}
              </span>
            </li>
          </ul>
        )}
      </section>

      <button
        type="button"
        className="self-start rounded-md bg-brand px-4 py-2 font-medium text-on-brand transition-colors hover:bg-brand-hover"
      >
        Primary action
      </button>
    </main>
  );
}
