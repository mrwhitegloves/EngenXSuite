// The service worker of the app. Its only job: show a notification that the server pushes,
// also when no tab of the app is open, and open the right page when it is clicked.
// It keeps no copy of pages or data (no offline mode).
/* global self, URL */

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { title: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || 'New notification', {
      body: message.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-16x16.png',
      // Where a click goes: a path inside the app.
      data: { link: message.link || '/notifications' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // An open tab of the app is brought to the front and taken to the page.
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        open.navigate(link);
        return open.focus();
      }
      return self.clients.openWindow(link);
    }),
  );
});
