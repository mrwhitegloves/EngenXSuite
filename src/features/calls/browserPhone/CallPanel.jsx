import { useEffect, useState } from 'react';
import { Grid3x3, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatLength } from '../labels.js';
import { useBrowserPhone } from './BrowserPhoneProvider.jsx';

const roundButton =
  'inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand';
const STATE_WORDS = {
  starting: 'Connecting…',
  calling: 'Calling…',
  ringing: 'Ringing…',
  ended: 'Call ended',
};
const ENDED_WORDS = {
  ended: 'Call ended',
  failed: 'The call did not go through',
};
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

// The seconds since the call was answered, ticking.
function Timer({ since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return <span>{formatLength(Math.max(0, Math.floor((now - since) / 1000)))}</span>;
}

function Who({ name, company, lead }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">{name}</p>
      <p className="truncate text-xs text-text-muted">
        {[company, lead].filter(Boolean).join(' · ') || ' '}
      </p>
    </div>
  );
}

// A call coming in: who it is, Answer and Reject.
function Incoming({ incoming, answer, reject }) {
  return (
    <div
      role="alertdialog"
      aria-label={`Incoming call from ${incoming.name}`}
      className="space-y-3"
    >
      <p className="flex items-center gap-2 text-xs font-medium text-brand-text">
        <PhoneIncoming size={14} aria-hidden="true" className="animate-pulse" />
        Incoming call
      </p>
      <Who name={incoming.name} company={incoming.company} lead={incoming.lead} />
      {incoming.number && incoming.number !== incoming.name && (
        <p className="text-xs text-text-muted">{incoming.number}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={reject}
          className="inline-flex items-center gap-1 rounded-md border border-danger px-3 py-2 text-sm text-danger hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
        >
          <PhoneOff size={16} aria-hidden="true" />
          Reject
        </button>
        <button
          type="button"
          onClick={answer}
          className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-2 text-sm font-medium text-on-brand hover:opacity-90 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Phone size={16} aria-hidden="true" />
          Answer
        </button>
      </div>
    </div>
  );
}

// The call going on: who, how long, Mute, Keypad, Hang up; afterwards a short summary.
function Ongoing({ call, hangup, toggleMute, sendDigit, dismiss }) {
  const [showsKeys, setShowsKeys] = useState(false);
  const isOver = call.state === 'ended';
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Who name={call.name} company={call.company} lead={call.lead} />
        {isOver && (
          <button
            type="button"
            aria-label="Close"
            onClick={dismiss}
            className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p role="status" className="text-sm">
        {call.state === 'talking' ? (
          <span className="text-success">
            Talking · <Timer since={call.answeredAt} />
          </span>
        ) : isOver ? (
          <span className="text-text-muted">
            {ENDED_WORDS[call.endedReason] ?? `The call ended (${call.endedReason})`}
          </span>
        ) : (
          <span className="text-text-muted">{STATE_WORDS[call.state]}</span>
        )}
      </p>
      {call.quality && !isOver && (
        <p role="alert" className="rounded-md border border-warning p-2 text-xs text-warning">
          {call.quality}
        </p>
      )}
      {showsKeys && !isOver && (
        <div className="grid grid-cols-3 gap-1.5">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => sendDigit(key)}
              className="rounded-md border border-border py-1.5 text-sm hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand"
            >
              {key}
            </button>
          ))}
        </div>
      )}
      {!isOver ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={call.isMuted}
            aria-label={call.isMuted ? 'Unmute' : 'Mute'}
            className={`${roundButton} ${call.isMuted ? 'border-warning text-warning' : ''}`}
          >
            {call.isMuted ? (
              <MicOff size={18} aria-hidden="true" />
            ) : (
              <Mic size={18} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowsKeys(!showsKeys)}
            aria-pressed={showsKeys}
            aria-label="Keypad"
            className={roundButton}
          >
            <Grid3x3 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={hangup}
            aria-label="Hang up"
            className="inline-flex size-11 items-center justify-center rounded-full bg-danger text-on-brand hover:opacity-90 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <PhoneOff size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        call.callId && (
          <Link
            to={`/calls/${call.callId}`}
            onClick={dismiss}
            className="block text-sm text-brand-text hover:underline"
          >
            Open the call (what came of it, recording)
          </Link>
        )
      )}
    </div>
  );
}

// The call panel: at the bottom right of every screen while a call rings or goes on.
export default function CallPanel() {
  const phone = useBrowserPhone();
  if (!phone.call && !phone.incoming) return null;
  return (
    <aside
      aria-label="Call"
      className="fixed right-4 bottom-20 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-4 text-text shadow-xl md:bottom-6"
    >
      {phone.incoming && !phone.call ? (
        <Incoming incoming={phone.incoming} answer={phone.answer} reject={phone.reject} />
      ) : (
        <Ongoing
          call={phone.call}
          hangup={phone.hangup}
          toggleMute={phone.toggleMute}
          sendDigit={phone.sendDigit}
          dismiss={phone.dismiss}
        />
      )}
    </aside>
  );
}
