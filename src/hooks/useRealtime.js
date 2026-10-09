import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { REALTIME_REFETCH } from '../config/realtimeEvents.js';

/**
 * Keeps one live connection to the server while someone is signed in.
 * The server sends small "this changed" events; each one marks the matching cached answers as
 * stale, and the screens that show them reload through the normal API.
 * Without a connection the app works as before: data reloads on navigation and on focus.
 *
 * @param {string | null} userId  The signed-in user's id, or null when nobody is signed in
 */
export function useRealtime(userId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return undefined;

    // Same origin as the API, so the session cookie signs the connection in.
    const socket = io({ withCredentials: true });
    let reconnectTimer = null;

    Object.entries(REALTIME_REFETCH).forEach(([event, queryKeys]) => {
      socket.on(event, () => {
        queryKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      });
    });

    // After a lost connection, events may have been missed: reload what is on screen.
    socket.io.on('reconnect', () => queryClient.invalidateQueries());

    // The server closed the connection (signed out everywhere, or deactivated). Ask who is
    // signed in: if nobody, the sign-in page shows; if this browser's session was kept, connect again.
    socket.on('disconnect', (reason) => {
      if (reason !== 'io server disconnect') return;
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      reconnectTimer = setTimeout(() => socket.connect(), 2000);
    });

    return () => {
      clearTimeout(reconnectTimer);
      socket.io.off('reconnect');
      socket.close();
    };
  }, [userId, queryClient]);
}
