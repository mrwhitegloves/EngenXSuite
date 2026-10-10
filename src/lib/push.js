import { apiRequest } from './apiClient.js';

// Browser push: notifications shown by the device itself, also when the app's tab is closed.
// It is switched on per browser, by the person, and needs their permission.

const WORKER_PATH = '/sw.js';

/** True when this browser can do push at all (some cannot: older iPhones outside "Add to Home Screen"). */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** The public key of the server's push key pair; null when the server has push switched off. */
async function loadPublicKey() {
  const response = await fetch('/api/public/config');
  if (!response.ok) return null;
  return (await response.json()).data?.pushPublicKey ?? null;
}

// The browser wants the key as bytes, the server gives it as text (base64, URL form).
function keyToBytes(key) {
  const padded = key.padEnd(key.length + ((4 - (key.length % 4)) % 4), '=');
  const text = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(WORKER_PATH);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * How push stands in this browser.
 * @returns {Promise<'unsupported' | 'not-configured' | 'blocked' | 'on' | 'off'>}
 *          blocked: the person refused the permission in the browser's own settings
 */
export async function getPushState() {
  if (!isPushSupported()) return 'unsupported';
  if (!(await loadPublicKey())) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** Ask for the permission, subscribe this browser and tell the server. */
export async function enablePush() {
  const publicKey = await loadPublicKey();
  if (!publicKey) throw new Error('Push is not set up on the server yet.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      'The browser did not allow notifications. Allow them in the browser’s settings for this site.',
    );
  }
  const registration = await navigator.serviceWorker.register(WORKER_PATH);
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(publicKey),
    }));
  const { endpoint, keys } = subscription.toJSON();
  await apiRequest('/notifications/push/subscribe', { method: 'POST', body: { endpoint, keys } });
}

/** Stop push in this browser and tell the server to forget it. */
export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await apiRequest('/notifications/push/unsubscribe', {
    method: 'POST',
    body: { endpoint: subscription.endpoint },
  }).catch(() => {});
  await subscription.unsubscribe();
}
