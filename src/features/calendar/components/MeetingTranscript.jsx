import { useState } from 'react';
import { Download, Pencil, Play, Radio } from 'lucide-react';
import { FormError, inputClass, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useMeetingTranscript, useTranscriptActions } from '../api.js';

const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

const clock = (ms) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const two = (value) => String(value).padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  return `${hours ? `${hours}:` : ''}${two(Math.floor(seconds / 60) % 60)}:${two(seconds % 60)}`;
};

function Line({ line, actions }) {
  const [draft, setDraft] = useState(null); // null: not being corrected
  const [audioLink, setAudioLink] = useState(null);
  const speakerTone = line.speaker.kind === 'mic' ? 'text-info' : 'text-brand-text';

  return (
    <li className="space-y-1 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-semibold ${speakerTone}`}>{line.speaker.name}</span>
        <span className="text-text-muted">{clock(line.offsetMs)}</span>
        {line.isEdited && <span className="text-text-muted">· corrected</span>}
        {line.hasAudio && !audioLink && (
          <button
            type="button"
            className={smallButton}
            aria-label={`Listen to the part at ${clock(line.offsetMs)}`}
            disabled={actions.audio.isPending}
            onClick={() => actions.audio.mutate(line.id, { onSuccess: setAudioLink })}
          >
            <Play size={11} aria-hidden="true" />
            Listen
          </button>
        )}
        {line.canEdit && draft === null && (
          <button
            type="button"
            className={smallButton}
            aria-label={`Correct the part at ${clock(line.offsetMs)}`}
            onClick={() => setDraft(line.text)}
          >
            <Pencil size={11} aria-hidden="true" />
          </button>
        )}
      </div>
      {audioLink && <audio src={audioLink} controls autoPlay className="h-8 w-full max-w-sm" />}
      {draft === null ? (
        <p className="wrap-break-word text-sm">
          {line.status === 'failed' ? (
            <span className="text-text-muted">(this part could not be read)</span>
          ) : (
            line.text
          )}
        </p>
      ) : (
        <div className="space-y-1">
          <textarea
            rows={3}
            className={`${inputClass} text-sm`}
            value={draft}
            maxLength={20000}
            aria-label="The corrected words"
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              disabled={actions.edit.isPending}
              onClick={() =>
                actions.edit.mutate(
                  { segmentId: line.id, text: draft },
                  { onSuccess: () => setDraft(null) },
                )
              }
            >
              Save
            </button>
            <button type="button" className={smallButton} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * The transcript the meeting recorder (Chrome extension) made of this meeting: who said what
 * and when, live while it is recorded. A part can be listened to (60 days) and corrected.
 * Nothing is shown when the meeting was never recorded.
 * @param {{ meetingId: string }} props
 */
export default function MeetingTranscript({ meetingId }) {
  const transcript = useMeetingTranscript(meetingId);
  const actions = useTranscriptActions(meetingId);
  const [showEchoes, setShowEchoes] = useState(false);
  const [search, setSearch] = useState('');
  const data = transcript.data;
  if (!data || data.recordings.length === 0) return null;

  const echoes = data.lines.filter((line) => line.isEcho).length;
  const needle = search.trim().toLowerCase();
  const lines = data.lines
    .filter((line) => showEchoes || !line.isEcho)
    .filter((line) => !needle || line.text.toLowerCase().includes(needle));
  const recorders = [...new Set(data.recordings.map((recording) => recording.recordedBy.name))];

  return (
    <section aria-label="Transcript of the meeting" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-medium">
          Transcript
          {data.isRecording && (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger px-2 py-0.5 text-xs font-semibold text-danger">
              <Radio size={11} aria-hidden="true" />
              Live
            </span>
          )}
        </h3>
        <button
          type="button"
          className={smallButton}
          disabled={actions.download.isPending || data.lines.length === 0}
          onClick={() => actions.download.mutate()}
        >
          <Download size={12} aria-hidden="true" />
          Download (TXT)
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Recorded by {recorders.join(', ')}.{' '}
        {data.waiting > 0
          ? `${data.waiting} part(s) are still being read.`
          : 'Written by a machine from the audio: check important words by listening.'}
      </p>
      {data.lines.length > 8 && (
        <input
          type="search"
          className={`${inputClass} text-sm`}
          placeholder="Search the transcript…"
          aria-label="Search the transcript"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      <FormError
        message={
          transcript.error?.message ??
          actions.edit.error?.message ??
          actions.audio.error?.message ??
          actions.download.error?.message
        }
      />
      {data.lines.length === 0 ? (
        <p className="text-sm text-text-muted">
          {data.isRecording ? 'Waiting for the first words…' : 'Nothing was said in the recording.'}
        </p>
      ) : (
        <ul className="max-h-112 overflow-y-auto rounded-md border border-border bg-page px-3">
          {lines.map((line) => (
            <Line key={line.id} line={line} actions={actions} />
          ))}
        </ul>
      )}
      {echoes > 0 && (
        <button type="button" className={smallButton} onClick={() => setShowEchoes(!showEchoes)}>
          {showEchoes
            ? 'Hide the echoes'
            : `Show ${echoes} hidden echo line(s) (the microphone heard the loudspeaker)`}
        </button>
      )}
    </section>
  );
}
