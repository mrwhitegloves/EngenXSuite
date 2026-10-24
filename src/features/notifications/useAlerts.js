import { useEffect, useRef } from 'react';
import { playMessageSound, unlockSoundOnFirstGesture } from '../../lib/sounds.js';
import { useNotifications } from './api.js';

const WORKER_PATH = '/sw.js';
// Notifications that come with a sound in the CRM.
const SOUND_TYPES = new Set(['whatsapp_received']);

/**
 * The sounds and the service worker of the signed-in app, used once in the app frame:
 *   - a "pop" when one of my new notifications is a WhatsApp message (on any screen);
 *   - the sound is woken up on the first click (the browser's rule);
 *   - a service worker that is already there is checked for a newer version.
 * The live "notifications.changed" event reloads my newest notifications, which runs this.
 */
export function useAlerts() {
  const newest = useNotifications({ pageSize: 5 });
  const seenRef = useRef(null);

  useEffect(() => {
    unlockSoundOnFirstGesture();
    navigator.serviceWorker
      ?.getRegistration(WORKER_PATH)
      .then((registration) => registration?.update())
      .catch(() => {});
  }, []);

  const rows = newest.data?.data;
  useEffect(() => {
    if (!rows) return;
    // The first answer is what was there before: no sound for it.
    if (!seenRef.current) {
      seenRef.current = new Set(rows.map((row) => row.id));
      return;
    }
    const fresh = rows.filter((row) => !seenRef.current.has(row.id));
    fresh.forEach((row) => seenRef.current.add(row.id));
    if (fresh.some((row) => SOUND_TYPES.has(row.type) && !row.isRead)) playMessageSound();
  }, [rows]);
}
