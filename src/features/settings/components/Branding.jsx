import { useState } from 'react';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { LOGOS } from '../../../config/branding.js';
import { useBranding } from '../../../hooks/useBranding.js';
import { useUpdateBranding } from '../api.js';

// The form. Rendered with a key made of the saved names, so it starts again from them whenever
// they change (after saving here, or when someone else changes them).
function BrandingForm({ saved, canEdit }) {
  const [form, setForm] = useState(saved);
  const updateBranding = useUpdateBranding();
  const errors = fieldErrorsFrom(updateBranding.error);

  const changed = {};
  if (form.productName.trim() !== saved.productName) changed.productName = form.productName.trim();
  if (form.companyName.trim() !== saved.companyName) changed.companyName = form.companyName.trim();
  const hasChanges = Object.keys(changed).length > 0;
  const isValid = form.productName.trim() && form.companyName.trim();

  function save(event) {
    event.preventDefault();
    updateBranding.mutate(changed);
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4" noValidate>
      <Field
        label="Product name"
        hint="The name of this system: page title, sign-in page, emails and documents."
        error={errors.productName}
      >
        {(props) => (
          <input
            {...props}
            value={form.productName}
            maxLength={60}
            disabled={!canEdit}
            onChange={(event) => setForm({ ...form, productName: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>
      <Field
        label="Company name"
        hint="Printed on proposals, quotations and invoices."
        error={errors.companyName}
      >
        {(props) => (
          <input
            {...props}
            value={form.companyName}
            maxLength={120}
            disabled={!canEdit}
            onChange={(event) => setForm({ ...form, companyName: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>

      <FormError
        message={Object.keys(errors).length === 0 ? updateBranding.error?.message : null}
      />

      {canEdit && (
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!hasChanges || !isValid || updateBranding.isPending}
          >
            {updateBranding.isPending ? 'Saving…' : 'Save names'}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!hasChanges || updateBranding.isPending}
            onClick={() => setForm(saved)}
          >
            Reset
          </button>
        </div>
      )}
    </form>
  );
}

function LogoPreview({ title, file, dark }) {
  const [isMissing, setIsMissing] = useState(false);
  return (
    <figure className="rounded-md border border-border">
      <div
        className={`flex h-20 items-center justify-center rounded-t-md px-4 ${dark ? 'bg-sidebar' : 'bg-white'}`}
      >
        {isMissing ? (
          <span className={`text-sm ${dark ? 'text-on-sidebar/70' : 'text-text-muted'}`}>
            Not added yet
          </span>
        ) : (
          <img
            src={file}
            alt=""
            className="max-h-10 max-w-full"
            onError={() => setIsMissing(true)}
          />
        )}
      </div>
      <figcaption className="border-t border-border px-3 py-2 text-sm">
        <div className="font-medium">{title}</div>
        <div className="font-mono text-xs break-all text-text-muted">{file.slice(1)}</div>
      </figcaption>
    </figure>
  );
}

// Settings → Branding: the names shown everywhere, and the logo files in use.
export default function Branding({ canEdit }) {
  const saved = useBranding();

  return (
    <div className="space-y-8">
      {saved.productName ? (
        <BrandingForm
          key={`${saved.productName}|${saved.companyName}`}
          saved={saved}
          canEdit={canEdit}
        />
      ) : (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}

      <section>
        <h3 className="font-semibold">Logos</h3>
        <p className="mt-1 mb-3 max-w-2xl text-sm text-text-muted">
          The logos are image files in the client project&apos;s <code>public</code> folder. To
          change one, replace the file there with a new image of the same name.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LogoPreview title="Full logo, dark background" file={LOGOS.full.onDark} dark />
          <LogoPreview title="Full logo, light background" file={LOGOS.full.onLight} />
          <LogoPreview title="Short logo, dark background" file={LOGOS.short.onDark} dark />
          <LogoPreview title="Short logo, light background" file={LOGOS.short.onLight} />
        </div>
      </section>
    </div>
  );
}
