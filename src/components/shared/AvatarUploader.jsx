import { useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { FormError, secondaryButtonClass } from './form.jsx';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Shows the current picture (or initials) with "Upload picture" and "Remove".
 * The file is chosen from the person's own computer or phone and sent straight away.
 *
 * `onUpload(file)` and `onRemove()` do the actual requests and return promises; this component
 * only handles choosing the file, the quick checks and the messages.
 */
export default function AvatarUploader({ name, url, onUpload, onRemove }) {
  const inputRef = useRef(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(action) {
    setIsBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setIsBusy(false);
    }
  }

  function handleFileChosen(event) {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again still triggers a change.
    event.target.value = '';
    if (!file) return;
    // Quick checks for a fast message. The server checks the real file content again.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a PNG, JPG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('The picture is too large. The limit is 2 MB.');
      return;
    }
    run(() => onUpload(file));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar name={name} url={url} size="lg" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileChosen}
            className="sr-only"
            aria-label="Choose a profile picture"
            tabIndex={-1}
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            className={secondaryButtonClass}
          >
            <Upload size={16} aria-hidden="true" />
            {isBusy ? 'Working…' : url ? 'Change picture' : 'Upload picture'}
          </button>
          {url && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => run(onRemove)}
              className={secondaryButtonClass}
            >
              <Trash2 size={16} aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-text-muted">PNG, JPG or WebP, up to 2 MB.</p>
      <FormError message={error} />
    </div>
  );
}
