// The frame shared by the small signed-out pages (forgot password, reset password).
export default function AuthCard({ title, description, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && <p className="mt-1 text-text-muted">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

// Shown wherever a user types a password they chose themselves (decision 0010): people must
// know before they type it that it is not private inside this product.
export function PasswordVisibilityNotice() {
  return (
    <p className="rounded-md border border-warning px-3 py-2 text-sm">
      Your administrator and your manager can see this password. Do not use a password that you use
      anywhere else.
    </p>
  );
}
