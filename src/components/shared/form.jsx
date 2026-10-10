import { useId } from 'react';

// Small form building blocks so every form looks and behaves the same.

// How every input and select looks, without a width: for a control that is as wide as its
// content (a filter above a list, a select inside a table row).
export const compactInputClass =
  'rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ' +
  'disabled:opacity-60 aria-[invalid=true]:border-danger';

// The same, filling the width of its place: for the fields of a form.
export const inputClass = `w-full ${compactInputClass}`;

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 font-medium text-on-brand ' +
  'transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 font-medium ' +
  'transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:opacity-60 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * A labelled field with its error message. `children` is a function that receives the props
 * the input needs (id, aria-invalid, aria-describedby), so label and error are wired correctly.
 */
export function Field({ label, error, hint, children }) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {(error || hint) && (
        <p id={messageId} className={`mt-1 text-sm ${error ? 'text-danger' : 'text-text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/** A message for a whole form (for example "The email or password is not correct"). */
export function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

/**
 * Turn an API error into field errors: the server sends details as [{ field, message }].
 * Returns { fieldName: message }.
 */
export function fieldErrorsFrom(error) {
  const details = Array.isArray(error?.details) ? error.details : [];
  return Object.fromEntries(
    details.filter((item) => item.field).map((item) => [item.field, item.message ?? error.message]),
  );
}

/** A strong random password for a new account (the user replaces it at first sign-in). */
export function generatePassword(length = 16) {
  // No look-alike characters (0/O, 1/l/I), so it can be read out or typed without mistakes.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const random = new Uint32Array(length);
  window.crypto.getRandomValues(random);
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join('');
}
