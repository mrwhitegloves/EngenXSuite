import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { REALTIME_REFETCH } from '../config/realtimeEvents.js';
import { apiRequest } from '../lib/apiClient.js';

const RETRY_MS = 15_000;

/** A short-lived pass for the live connection, and where to connect (null = this same address). */
async function fetchTicket() {
  const payload = await apiRequest('/realtime/ticket');
  return payload.data;
}

/**
 * Keeps one live connection to the server while someone is signed in.
 * The server sends small "this changed" events; each one marks the matching cached answers as
 * stale, and the screens that show them reload through the normal API.
 * Without a connection the app works as before: data reloads on navigation and on focus.
 *
 * The connection is opened with a ticket from the API (which checks the session). In production
 * it goes straight to the server's own address, not through the client's host.
 *
 * @param {string | null} userId  The signed-in user's id, or null when nobody is signed in
 */
export function useRealtime(userId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return undefined;

    let socket = null;
    let timer = null;
    let stopped = false;

    async function start() {
      let first;
      try {
        first = await fetchTicket();
      } catch {
        // No ticket (offline, or the session ended): try again later. If the session ended,
        // this hook is switched off by the sign-in page before that.
        if (!stopped) timer = setTimeout(start, RETRY_MS);
        return;
      }
      if (stopped) return;

      let unusedTicket = first.ticket;
      socket = io(first.url ?? undefined, {
        // Called for every connection attempt: a ticket is used once, then a new one is fetched.
        auth: (callback) => {
          if (unusedTicket) {
            callback({ ticket: unusedTicket });
            unusedTicket = null;
            return;
          }
          fetchTicket()
            .then((next) => callback({ ticket: next.ticket }))
            .catch(() => callback({}));
        },
      });

      Object.entries(REALTIME_REFETCH).forEach(([event, queryKeys]) => {
        socket.on(event, () => {
          queryKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
        });
      });

      // After a lost connection, events may have been missed: reload what is on screen.
      socket.io.on('reconnect', () => queryClient.invalidateQueries());

      // The server closed the connection (signed out everywhere, or deactivated). Ask who is
      // signed in: if nobody, the sign-in page shows; if this browser's session was kept,
      // connect again.
      socket.on('disconnect', (reason) => {
        if (reason !== 'io server disconnect') return;
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        timer = setTimeout(() => socket.connect(), 2000);
      });
    }

    start();

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (socket) {
        socket.io.off('reconnect');
        socket.close();
      }
    };
  }, [userId, queryClient]);
}
