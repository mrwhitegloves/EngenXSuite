import { useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const emptyRow = () => ({ key: '', value: '' });

/**
 * Add or edit a link: name, address, description, credentials (key = value rows) and a
 * thumbnail picture. The picture is uploaded after the link is saved (it needs the link's id).
 */
export default function LinkDialog({ link, actions, onClose }) {
  const editing = Boolean(link);
  const [form, setForm] = useState({
    name: link?.name ?? '',
    url: link?.url ?? '',
    description: link?.description ?? '',
  });
  const [rows, setRows] = useState(link?.credentials?.length ? link.credentials : [emptyRow()]);
  const [picture, setPicture] = useState(null); // a new File
  const [preview, setPreview] = useState(link?.thumbnailUrl ?? null);
  const [dropPicture, setDropPicture] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInput = useRef(null);

  const save = editing ? actions.update : actions.create;
  const errors = fieldErrorsFrom(save.error);
  const busy =
    save.isPending || actions.uploadThumbnail.isPending || actions.removeThumbnail.isPending;
  const thumbnailError = actions.uploadThumbnail.error?.message;
  // Errors of the rows arrive as "credentials.0.key" and similar.
  const credentialError = Object.entries(errors).find(([field]) =>
    field.startsWith('credentials'),
  )?.[1];

  const setRow = (index, field, value) =>
    setRows((current) =>
      current.map((row, at) => (at === index ? { ...row, [field]: value } : row)),
    );

  const choosePicture = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setPictureError('Choose a PNG, JPG or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPictureError('The image is too large. The limit is 2 MB.');
      return;
    }
    setPictureError('');
    setPicture(file);
    setDropPicture(false);
    setPreview(URL.createObjectURL(file));
  };

  const submit = (event) => {
    event.preventDefault();
    const body = {
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      credentials: rows
        .map((row) => ({ key: row.key.trim(), value: row.value }))
        .filter((row) => row.key),
    };
    save.mutate(editing ? { id: link.id, ...body } : body, {
      onSuccess: async ({ data }) => {
        try {
          if (picture) await actions.uploadThumbnail.mutateAsync({ id: data.id, file: picture });
          else if (dropPicture && link?.thumbnailUrl)
            await actions.removeThumbnail.mutateAsync(data.id);
          onClose();
        } catch {
          // The link is saved; the picture error is shown in the dialog.
        }
      },
    });
  };

  return (
    <Dialog open wide title={editing ? 'Edit link' : 'New link'} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name}>
            {(props) => (
              <input
                {...props}
                autoFocus
                maxLength={120}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={inputClass}
                placeholder="Google Ads"
              />
            )}
          </Field>
          <Field label="Web address" error={errors.url}>
            {(props) => (
              <input
                {...props}
                type="url"
                maxLength={2000}
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                className={inputClass}
                placeholder="https://"
              />
            )}
          </Field>
        </div>

        <Field label="Description (optional)" error={errors.description}>
          {(props) => (
            <textarea
              {...props}
              rows={2}
              maxLength={1000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={inputClass}
            />
          )}
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Credentials (optional)</legend>
          <p className="text-xs text-text-muted">
            One detail per row, for example Email ID = name@company.com. Values are stored
            encrypted.
          </p>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                aria-label={`Detail ${index + 1} name`}
                maxLength={60}
                value={row.key}
                onChange={(event) => setRow(index, 'key', event.target.value)}
                className={`${inputClass} sm:max-w-[40%]`}
                placeholder="Email ID"
              />
              <span className="text-text-muted">=</span>
              <input
                aria-label={`Detail ${index + 1} value`}
                maxLength={500}
                value={row.value}
                onChange={(event) => setRow(index, 'value', event.target.value)}
                className={inputClass}
                placeholder="name@company.com"
                autoComplete="off"
              />
              <button
                type="button"
                aria-label={`Remove detail ${index + 1}`}
                className="rounded-md p-2 text-text-muted hover:text-danger"
                onClick={() =>
                  setRows((current) =>
                    current.length === 1 ? [emptyRow()] : current.filter((_, at) => at !== index),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {credentialError && <p className="text-sm text-danger">{credentialError}</p>}
          {rows.length < 20 && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setRows((current) => [...current, emptyRow()])}
            >
              <Plus size={16} /> Add a detail
            </button>
          )}
        </fieldset>

        <div>
          <p className="mb-1 text-sm font-medium">Thumbnail picture (optional)</p>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border border-border bg-page">
              {preview && !dropPicture ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus size={20} className="text-text-muted" aria-hidden="true" />
              )}
            </div>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => fileInput.current?.click()}
            >
              {preview && !dropPicture ? 'Change' : 'Choose a picture'}
            </button>
            {preview && !dropPicture && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-danger"
                onClick={() => {
                  setPicture(null);
                  setDropPicture(true);
                }}
              >
                <X size={14} /> Remove
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={choosePicture}
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">PNG, JPG or WebP, at most 2 MB.</p>
          {(pictureError || thumbnailError) && (
            <p className="mt-1 text-sm text-danger">{pictureError || thumbnailError}</p>
          )}
        </div>

        <FormError
          message={
            save.error && !errors.name && !errors.url && !errors.description && !credentialError
              ? save.error.message
              : null
          }
        />
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!form.name.trim() || !form.url.trim() || busy}
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save link'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
