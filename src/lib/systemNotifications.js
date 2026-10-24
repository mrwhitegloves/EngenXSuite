// A notification of the computer itself (Windows, macOS), shown by the open CRM page: used
// for an incoming call. Notifications that the server pushes (new WhatsApp messages, tasks …)
// are shown by the service worker (public/sw.js) instead, also when the CRM is closed.
// Nothing is shown unless the person allowed notifications for the CRM in the browser.

const WORKER_PATH = '/sw.js';
const shownByPage = new Map();

const isAllowed = () =>
  typeof Notification !== 'undefined' && Notification.permission === 'granted';

/**
 * @param {{ tag: string, title: string, body?: string, requireInteraction?: boolean }} message
 *        tag: a second notification with the same tag replaces the first
 */
export async function showSystemNotification({ tag, title, body, requireInteraction = false }) {
  if (!isAllowed()) return;
  const options = {
    body: body ?? '',
    tag,
    requireInteraction,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-16x16.png',
    // A click brings the CRM tab to the front without changing its page.
    data: { focusOnly: true },
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration(WORKER_PATH);
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Fall back to a notification of the page below.
  }
  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  shownByPage.get(tag)?.close();
  shownByPage.set(tag, notification);
}

export async function closeSystemNotification(tag) {
  shownByPage.get(tag)?.close();
  shownByPage.delete(tag);
  try {
    const registration = await navigator.serviceWorker?.getRegistration(WORKER_PATH);
    const open = (await registration?.getNotifications({ tag })) ?? [];
    open.forEach((item) => item.close());
  } catch {
    // Nothing to close.
  }
}

/** True when the person is not looking at the CRM tab right now. */
export const isPageInBackground = () =>
  document.visibilityState !== 'visible' || !document.hasFocus();
