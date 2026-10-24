// The service worker of the app. Its only job: show a notification that the server pushes,
// also when no tab of the app is open, and open the right page when it is clicked.
// It keeps no copy of pages or data (no offline mode).
/* global self, URL */

const isWhatsAppLink = (link) => link.startsWith('/whatsapp');

// Someone is looking at the WhatsApp screen right now (a visible tab on /whatsapp).
async function isWatchingWhatsApp() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.some(
    (client) =>
      client.visibilityState === 'visible' &&
      new URL(client.url).origin === self.location.origin &&
      new URL(client.url).pathname.startsWith('/whatsapp'),
  );
}

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { title: event.data ? event.data.text() : '' };
  }
  const link = message.link || '/notifications';
  const isWhatsApp = isWhatsAppLink(link);
  event.waitUntil(
    (async () => {
      // A new WhatsApp message while the WhatsApp screen is open: the screen shows it already.
      if (isWhatsApp && (await isWatchingWhatsApp())) return;
      await self.registration.showNotification(message.title || 'New notification', {
        body: message.body || '',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-16x16.png',
        // Where a click goes: a path inside the app.
        data: { link },
        // The messages of one chat replace each other instead of piling up, and still alert.
        ...(isWhatsApp ? { tag: link, renotify: true } : {}),
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const link = data.link || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // An open tab of the app is brought to the front and taken to the page.
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        // An incoming call: only bring the tab forward, the call panel is on every page.
        if (!data.focusOnly) open.navigate(link);
        return open.focus();
      }
      return self.clients.openWindow(data.focusOnly ? '/' : link);
    }),
  );
});
