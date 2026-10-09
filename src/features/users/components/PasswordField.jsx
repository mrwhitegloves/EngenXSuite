import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Field, generatePassword, inputClass } from '../../../components/shared/form.jsx';

const smallButton =
  'rounded-md border border-border p-2 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand';

/**
 * A password an administrator sets for someone else's account. Shown as plain text on purpose:
 * the person setting it has to pass it on to the user.
 */
export default function PasswordField({ label = 'Password', hint, value, onChange, error }) {
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
    <Field label={label} hint={hint} error={error}>
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
