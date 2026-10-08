import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Field, generatePassword, inputClass } from '../../../components/shared/form.jsx';

const smallButton =
  'rounded-md border border-border p-2 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand';

/**
 * The first password for someone else's account. Shown as plain text on purpose: the person
 * creating the account has to pass it on, and the user must replace it at their first sign-in.
 */
export default function PasswordField({ value, onChange, error }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the password is visible and can be selected by hand.
    }
  }

  return (
    <Field
      label="First password"
      hint="At least 10 characters. The user must choose their own at the first sign-in."
      error={error}
    >
      {(props) => (
        <div className="flex gap-2">
          <input
            {...props}
            type="text"
            autoComplete="off"
            spellCheck="false"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${inputClass} font-mono`}
          />
          <button
            type="button"
            title="Generate a strong password"
            aria-label="Generate a strong password"
            onClick={() => onChange(generatePassword())}
            className={smallButton}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Copy password"
            aria-label="Copy password"
            disabled={!value}
            onClick={copy}
            className={smallButton}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </Field>
  );
}
