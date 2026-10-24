// The sounds of the CRM: a short "pop" for a new WhatsApp message and the ringtone of an
// incoming call. They are made in the browser (Web Audio), so no sound file is downloaded.
// A custom ringtone from Settings → Calls is played instead of the built-in one.
//
// Browsers play sound only after the person has clicked or typed on the page once; until then
// the sounds stay silent (nothing breaks).

let context = null;
let lastMessageSoundAt = 0;
let ringTimer = null;
let ringAudio = null;
const MESSAGE_SOUND_GAP_MS = 1500;
const RING_REPEAT_MS = 2600;

function audioContext() {
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  context ??= new Context();
  return context;
}

/** Wake the sound up on the first click or key press (the browser's rule for sound). */
export function unlockSoundOnFirstGesture() {
  const unlock = () => {
    const audio = audioContext();
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

// One soft note: a quick start and a gentle fade, like a struck bell.
function note(audio, frequency, startAt, length, volume) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + length);
  gain.connect(audio.destination);
  // A pure tone with a quieter octave above: warm, not shrill.
  [
    [frequency, 'sine', 1],
    [frequency * 2, 'triangle', 0.25],
  ].forEach(([pitch, type, share]) => {
    const oscillator = audio.createOscillator();
    const partGain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(pitch, startAt);
    partGain.gain.value = share;
    oscillator.connect(partGain).connect(gain);
    oscillator.start(startAt);
    oscillator.stop(startAt + length + 0.05);
  });
}

/** A short two-note "pop" for a new message. Several messages at once play it once. */
export function playMessageSound() {
  const audio = audioContext();
  if (!audio || audio.state !== 'running') return;
  const now = Date.now();
  if (now - lastMessageSoundAt < MESSAGE_SOUND_GAP_MS) return;
  lastMessageSoundAt = now;
  const at = audio.currentTime;
  note(audio, 988, at, 0.18, 0.18);
  note(audio, 1319, at + 0.09, 0.28, 0.16);
}

// One round of the built-in ringtone: a rising four-note phrase, played twice.
function ringOnce(audio) {
  const at = audio.currentTime;
  const phrase = [659, 831, 988, 1319];
  [0, 0.75].forEach((offset) => {
    phrase.forEach((pitch, index) => note(audio, pitch, at + offset + index * 0.12, 0.45, 0.22));
  });
}

/**
 * Ring until stopRingtone(): the custom ringtone when one is set, else the built-in one.
 * @param {string | null} [customUrl]
 */
export function startRingtone(customUrl) {
  stopRingtone();
  if (customUrl) {
    ringAudio = new Audio(customUrl);
    ringAudio.loop = true;
    ringAudio.play().catch(() => {});
    return;
  }
  const audio = audioContext();
  if (!audio || audio.state !== 'running') return;
  ringOnce(audio);
  ringTimer = setInterval(() => ringOnce(audio), RING_REPEAT_MS);
}

export function stopRingtone() {
  clearInterval(ringTimer);
  ringTimer = null;
  if (ringAudio) {
    ringAudio.pause();
    ringAudio = null;
  }
}
