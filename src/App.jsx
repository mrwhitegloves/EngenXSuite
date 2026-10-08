import { Route, Routes } from 'react-router-dom';
import AppRoutes from './routes.jsx';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useBranding } from './hooks/useBranding.js';
import { useTheme } from './hooks/useTheme.js';
import LoginPage from './features/auth/pages/LoginPage.jsx';
import ChangePasswordPage from './features/auth/pages/ChangePasswordPage.jsx';

// Decides what to show from the sign-in state: loading, an error, the sign-in page, or the app.
export default function App() {
  const { status, user, error, retry } = useAuth();
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

  if (status === 'signedOut') {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Any other address shows the sign-in page, so a deep link still works after signing in. */}
        <Route path="*" element={<LoginPage productName={productName} />} />
      </Routes>
    );
  }

  // A password set by someone else must be replaced before anything else is shown.
  // (The server enforces the same rule on every request.)
  if (user.mustChangePassword) return <ChangePasswordPage />;

  return <AppRoutes productName={productName} />;
}
