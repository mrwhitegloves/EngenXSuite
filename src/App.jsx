import AppRoutes from './routes.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useBranding } from './hooks/useBranding.js';
import { useTheme } from './hooks/useTheme.js';
import LoginPage from './features/auth/pages/LoginPage.jsx';

// Decides what to show from the sign-in state: loading, an error, the sign-in page, or the app.
export default function App() {
  const { status, error, retry } = useAuth();
  const { productName } = useBranding();
  // Called here so the theme is applied on every screen, including the sign-in page.
  useTheme();

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
          onClick={() => retry()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === 'signedOut') return <LoginPage productName={productName} />;

  return <AppRoutes productName={productName} />;
}
