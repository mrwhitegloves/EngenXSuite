import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth.js';
import { useCan } from '../../../hooks/useCan.js';
import { apiRequest } from '../../../lib/apiClient.js';
import { startRingtone, stopRingtone } from '../../../lib/sounds.js';
import {
  closeSystemNotification,
  isPageInBackground,
  showSystemNotification,
} from '../../../lib/systemNotifications.js';

// Calls inside the CRM (docs/planning/browser-calling.md). This keeps the person's browser
// signed in to Plivo (Plivo's Browser SDK, over WebRTC), holds the state of the one call that
// is going on, and gives the screens a way to start, answer and end calls.
//
// - The sign-in is a token from our server for the person's own endpoint (up to a day). When
//   the connection drops, a new token is fetched and the browser signs in again by itself.
// - Only ONE tab of the CRM is the phone (a lock in localStorage); other tabs say so.
// - The microphone is asked for at the first call, not when the page opens.

const BrowserPhoneContext = createContext(null);
const LOCK_KEY = 'crm-browser-phone-tab';
const LOCK_STALE_MS = 15_000;
const HEARTBEAT_MS = 5_000;
const RETRY_MS = 10_000;
// The computer's notification of an incoming call; a new one replaces the old one.
const CALL_NOTIFICATION_TAG = 'incoming-call';
const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readLock() {
  try {
    return JSON.parse(window.localStorage.getItem(LOCK_KEY) ?? 'null');
  } catch {
    return null;
  }
}
function writeLock() {
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId, at: Date.now() }));
    return true;
  } catch {
    // Storage blocked (private window): this tab works on its own.
    return true;
  }
}
/** True when this tab holds the lock now (taking it when it is free or stale). */
function claimLock() {
  const lock = readLock();
  if (!lock || lock.tabId === tabId || Date.now() - lock.at > LOCK_STALE_MS) return writeLock();
  return false;
}
function releaseLock() {
  try {
    if (readLock()?.tabId === tabId) window.localStorage.removeItem(LOCK_KEY);
  } catch {
    // nothing to release
  }
}

/** A header Plivo passes on, whatever the case of its name. */
const headerOf = (headers, name) =>
  Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ??
  null;

// Words for what Plivo says about the line during a call (its mediaMetrics events).
const QUALITY_WORDS = {
  high_jitter: 'The line is unsteady: the sound may break up.',
  high_rtt: 'The line is slow: there may be a delay.',
  high_packetloss: 'The connection is losing sound.',
  low_mos: 'The call quality is poor.',
  no_audio_received: 'No sound is coming through.',
  speaking_on_mute: 'You are speaking, but you are on mute.',
};

/**
 * @typedef {{ callId: string | null, direction: 'outgoing' | 'incoming',
 *   state: 'starting' | 'calling' | 'ringing' | 'talking' | 'ended',
 *   name: string, number?: string, company?: string | null, lead?: string | null,
 *   answeredAt?: number, endedReason?: string, isMuted: boolean, quality?: string }} CallState
 */
export default function BrowserPhoneProvider({ children }) {
  const { user, status: authStatus } = useAuth();
  const can = useCan();
  const queryClient = useQueryClient();
  const mayCall = authStatus === 'signedIn' && can('calls', 'create');
  // off: not available here. loading: signing in. ready: calls work. otherTab: another tab is
  // the phone. error: the sign-in failed (it is tried again).
  const [status, setStatus] = useState('off');
  const [problem, setProblem] = useState(null);
  /** @type {[CallState | null, Function]} */
  const [call, setCall] = useState(null);
  const [incoming, setIncoming] = useState(null);
  // The custom ringtone of Settings → Calls; null: the CRM's own ringtone (lib/sounds.js).
  const ringtoneRef = useRef(null);
  const clientRef = useRef(null);
  const retryRef = useRef(null);
  const endTimerRef = useRef(null);

  const refreshCalls = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  }, [queryClient]);

  // Who is calling in, from the call the server wrote (it carries the access check).
  const describeIncoming = useCallback(async (callId) => {
    if (!callId) return null;
    try {
      const { data } = await apiRequest(`/calls/${callId}`);
      return {
        name: data.contact?.name ?? data.number,
        number: data.number,
        company: data.account?.name ?? null,
        lead: data.lead?.name ?? null,
      };
    } catch {
      return null;
    }
  }, []);

  // While a call is coming in: the ringtone, and the computer's own notification when the CRM
  // tab is not in front. Both stop when the call is answered, refused, or given up.
  const ringingId = incoming ? (incoming.callUUID ?? 'ringing') : null;
  useEffect(() => {
    if (!ringingId) return undefined;
    startRingtone(ringtoneRef.current);
    return () => {
      stopRingtone();
      closeSystemNotification(CALL_NOTIFICATION_TAG);
    };
  }, [ringingId]);
  const incomingName = incoming?.name;
  const incomingDetail = incoming
    ? [incoming.company, incoming.number !== incoming.name ? incoming.number : null]
        .filter(Boolean)
        .join(' · ')
    : '';
  useEffect(() => {
    if (!ringingId || !isPageInBackground()) return;
    showSystemNotification({
      tag: CALL_NOTIFICATION_TAG,
      title: `Incoming call: ${incomingName}`,
      body: incomingDetail || 'Open the CRM to answer.',
      requireInteraction: true,
    });
  }, [ringingId, incomingName, incomingDetail]);

  const finishCall = useCallback(
    (reason) => {
      setIncoming(null);
      setCall((current) =>
        current ? { ...current, state: 'ended', endedReason: reason, quality: undefined } : null,
      );
      clearTimeout(endTimerRef.current);
      // The summary stays a moment, then the panel closes.
      endTimerRef.current = setTimeout(() => setCall(null), 6000);
      refreshCalls();
    },
    [refreshCalls],
  );

  useEffect(() => {
    if (!mayCall) return undefined;
    let isGone = false;
    let heartbeat = null;

    const signIn = async () => {
      clearTimeout(retryRef.current);
      try {
        const { data } = await apiRequest('/calls/browser-phone');
        if (isGone) return;
        if (!data.isAvailable) {
          setStatus('off');
          return;
        }
        let client = clientRef.current;
        if (!client) {
          // Loaded only for people who make calls: it is a large file.
          const { default: Plivo } = await import('plivo-browser-sdk');
          if (isGone) return;
          const sdk = new Plivo({
            debug: 'ERROR',
            permOnClick: true,
            closeProtection: true,
            allowMultipleIncomingCalls: false,
          });
          client = sdk.client;
          clientRef.current = client;
          // The SDK keeps one client for the page (window._PlivoInstance) and gives it back
          // again: the handlers of an earlier sign-in go first.
          client.removeAllListeners?.();
          wire(client);
        }
        // The CRM rings itself (a better sound, and the same ringtone setting): Plivo's is off.
        ringtoneRef.current = data.ringtoneUrl ?? null;
        client.setRingTone(false);
        setStatus('loading');
        client.loginWithAccessToken(data.token);
      } catch (error) {
        if (isGone) return;
        setStatus('error');
        setProblem(error?.message ?? 'Calls in the browser could not start.');
        retryRef.current = setTimeout(signIn, RETRY_MS * 3);
      }
    };

    function wire(client) {
      client.on('onLogin', () => {
        setStatus('ready');
        setProblem(null);
      });
      client.on('onLoginFailed', (code) => {
        setStatus('error');
        setProblem(
          String(code) === '10010'
            ? 'Calls are open in too many browsers. Close the CRM elsewhere.'
            : 'The browser could not sign in for calls. It tries again.',
        );
        retryRef.current = setTimeout(signIn, RETRY_MS);
      });
      client.on('onConnectionChange', (change) => {
        if (change?.state === 'disconnected') {
          setStatus('loading');
          retryRef.current = setTimeout(signIn, RETRY_MS);
        }
      });
      client.on('onWebrtcNotSupported', () => {
        setStatus('error');
        setProblem('This browser cannot make calls. Use Chrome, Edge or Firefox on a computer.');
      });
      client.on('onMediaPermission', (event) => {
        if (event?.status === 'failure') {
          setProblem(
            'The microphone is blocked. Allow it in the browser (the lock in the address bar).',
          );
        }
      });
      client.on('onCalling', () =>
        setCall((current) => (current ? { ...current, state: 'calling' } : current)),
      );
      client.on('onCallRemoteRinging', () =>
        setCall((current) => (current ? { ...current, state: 'ringing' } : current)),
      );
      client.on('onCallAnswered', () => {
        setIncoming(null);
        setCall((current) =>
          current ? { ...current, state: 'talking', answeredAt: Date.now() } : current,
        );
      });
      client.on('onCallTerminated', () => finishCall('ended'));
      client.on('onCallFailed', (cause) => finishCall(String(cause ?? 'failed')));
      client.on('onIncomingCall', async (callerId, extraHeaders, callInfo) => {
        const callId = headerOf(extraHeaders, 'X-PH-CallId');
        const ring = { callUUID: callInfo?.callUUID ?? null, callId, number: callerId };
        setIncoming({ ...ring, name: callerId });
        const info = await describeIncoming(callId);
        if (info)
          setIncoming((current) =>
            current?.callUUID === ring.callUUID ? { ...current, ...info } : current,
          );
      });
      client.on('onIncomingCallCanceled', () => setIncoming(null));
      client.on('mediaMetrics', (metric) => {
        const words = QUALITY_WORDS[metric?.type];
        if (!words) return;
        setCall((current) =>
          current ? { ...current, quality: metric.active === false ? undefined : words } : current,
        );
      });
    }

    // Only one tab is the phone.
    const takeTurn = () => {
      if (claimLock()) {
        if (!clientRef.current?.isLoggedIn) signIn();
      } else {
        setStatus('otherTab');
      }
    };
    takeTurn();
    heartbeat = setInterval(() => {
      if (readLock()?.tabId === tabId) writeLock();
      else takeTurn();
    }, HEARTBEAT_MS);
    window.addEventListener('beforeunload', releaseLock);

    return () => {
      isGone = true;
      clearInterval(heartbeat);
      clearTimeout(retryRef.current);
      window.removeEventListener('beforeunload', releaseLock);
      releaseLock();
      try {
        clientRef.current?.logout();
      } catch {
        // already signed out
      }
      clientRef.current = null;
      setStatus('off');
    };
  }, [mayCall, user?.id, describeIncoming, finishCall]);

  /** Call a contact from the CRM. The server writes the call first (and checks access). */
  const startCall = useCallback(
    async ({ contact, opportunityId }) => {
      const client = clientRef.current;
      if (!client || status !== 'ready') throw new Error('Calls in the browser are not ready.');
      if (call && call.state !== 'ended') throw new Error('Another call is going on.');
      clearTimeout(endTimerRef.current);
      setCall({
        callId: null,
        direction: 'outgoing',
        state: 'starting',
        name: contact.name,
        isMuted: false,
      });
      try {
        const { data } = await apiRequest('/calls/browser', {
          method: 'POST',
          body: { contactId: contact.id, ...(opportunityId ? { opportunityId } : {}) },
        });
        setCall((current) => ({
          ...current,
          callId: data.callId,
          number: data.to,
          company: data.call?.account?.name ?? null,
          lead: data.call?.lead?.name ?? null,
        }));
        client.call(data.to, { 'X-PH-CallId': data.callId });
        refreshCalls();
      } catch (error) {
        setCall(null);
        throw error;
      }
    },
    [status, call, refreshCalls],
  );

  const actions = useMemo(
    () => ({
      startCall,
      hangup: () => clientRef.current?.hangup(),
      toggleMute: () =>
        setCall((current) => {
          if (!current) return current;
          if (current.isMuted) clientRef.current?.unmute();
          else clientRef.current?.mute();
          return { ...current, isMuted: !current.isMuted };
        }),
      sendDigit: (digit) => clientRef.current?.sendDtmf(digit),
      answer: () => {
        if (!incoming) return;
        clearTimeout(endTimerRef.current);
        setCall({
          callId: incoming.callId,
          direction: 'incoming',
          state: 'starting',
          name: incoming.name,
          number: incoming.number,
          company: incoming.company ?? null,
          lead: incoming.lead ?? null,
          isMuted: false,
        });
        clientRef.current?.answer(incoming.callUUID, 'reject');
      },
      reject: () => {
        if (incoming) clientRef.current?.reject(incoming.callUUID);
        setIncoming(null);
      },
      dismiss: () => setCall(null),
    }),
    [startCall, incoming],
  );

  const value = useMemo(
    () => ({ status, problem, call, incoming, isReady: status === 'ready', ...actions }),
    [status, problem, call, incoming, actions],
  );
  return <BrowserPhoneContext.Provider value={value}>{children}</BrowserPhoneContext.Provider>;
}

/** The browser phone: its state, the current call, and the actions. */
export function useBrowserPhone() {
  return useContext(BrowserPhoneContext) ?? { status: 'off', isReady: false };
}
