import * as Sentry from '@sentry/react';

// Error tracking for the browser app. The Sentry address (DSN) is not written in this code: it
// comes from the server's public config, so the client project has no settings file of its own.
// When the server has no DSN configured, nothing is loaded and nothing is sent.

let started = false;

export async function startErrorTracking() {
  if (started) return;
  started = true;
  try {
    const response = await fetch('/api/public/config');
    if (!response.ok) return;
    const { data } = await response.json();
    if (!data?.sentryDsn) return;

    Sentry.init({
      dsn: data.sentryDsn,
      environment: data.environment,
      // Only errors. No performance tracing and no session replay: not needed at this size,
      // and replay would record what users type.
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  } catch {
    // Error tracking is optional. The app must work the same without it.
  }
}

/** Tell Sentry who is signed in, by id only (never name or email). */
export function setTrackedUser(userId) {
  if (Sentry.getClient()) Sentry.setUser(userId ? { id: userId } : null);
}
