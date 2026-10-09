import { useState } from 'react';

// A user's picture, or their initials on a coloured circle when they have no picture.
// "Vivek Pradhan" → VP, "Vivek" → V. The colour is worked out from the name, so the same person
// always gets the same colour on every screen and device. Everything happens here in the browser:
// no name is sent to an outside avatar service.

const COLOUR_COUNT = 8; // --avatar-1 … --avatar-8 in styles/tokens.css

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

/** First letter of the first word and of the last word; one letter for a single-word name. */
export function initialsOf(name) {
  const words = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return (first + last).toUpperCase();
}

/** A stable number from 1 to COLOUR_COUNT for a name. */
export function colourIndexOf(name) {
  let hash = 0;
  for (const character of String(name ?? '').toLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)) % 100_000;
  }
  return (hash % COLOUR_COUNT) + 1;
}

// How many times a picture is tried before the initials are shown instead.
const MAX_ATTEMPTS = 3;

export default function Avatar({ name, url, size = 'sm' }) {
  // The rule: a user with a picture address always gets the picture; initials are only for a
  // user without one. Picture hosts (Google in particular) sometimes refuse a single request,
  // so one failed load is retried instead of giving up straight away. Only when the picture
  // keeps failing (deleted file, dead link) do the initials stand in for it.
  const [failures, setFailures] = useState({ url: null, count: 0 });
  const failedCount = failures.url === url ? failures.count : 0;
  const sizeClass = SIZES[size] ?? SIZES.sm;

  if (url && failedCount < MAX_ATTEMPTS) {
    return (
      <img
        // A new key makes the browser request the picture again after a failure.
        key={`${url}#${failedCount}`}
        src={url}
        alt=""
        // Google's picture host rejects requests more often when they carry the page address,
        // and the picture host never needs to know which page asked.
        referrerPolicy="no-referrer"
        onError={() => {
          // Wait a little longer before each new try.
          window.setTimeout(
            () => setFailures({ url, count: failedCount + 1 }),
            400 * (failedCount + 1),
          );
        }}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: `var(--avatar-${colourIndexOf(name)})` }}
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {initialsOf(name)}
    </span>
  );
}
