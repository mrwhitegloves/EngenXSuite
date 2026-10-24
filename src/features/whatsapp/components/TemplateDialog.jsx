import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, ImagePlus, Megaphone, Video } from 'lucide-react';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  compactInputClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import DocumentPicker from '../../documents/components/DocumentPicker.jsx';
import { useTemplates } from '../api.js';
import { renderWhatsAppText } from '../waFormat.jsx';

const HEADER_KINDS = {
  IMAGE: { word: 'an image', accept: 'image/jpeg,image/png', icon: ImagePlus },
  VIDEO: { word: 'a video', accept: 'video/mp4,video/3gpp', icon: Video },
  DOCUMENT: {
    word: 'a document',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
    icon: FileText,
  },
};

// What a variable starts with: {{1}} the first name, {{2}} the company (named variables by
// their name). The person can change every value.
function startingValues(template, conversation) {
  const firstName = String(conversation.contact?.name ?? conversation.profileName ?? '').split(
    ' ',
  )[0];
  const company = conversation.account?.name ?? '';
  return Object.fromEntries(
    template.variables.map((place) => {
      const name = place.toLowerCase();
      if (place === '1' || /^(first_?name|name|customer_?name)$/.test(name))
        return [place, firstName];
      if (place === '2' || /company/.test(name)) return [place, company];
      return [place, ''];
    }),
  );
}

// The template as WhatsApp will show it.
function Preview({ template, values, headerPreview }) {
  const text = template.bodyText.replace(/{{\s*(\w+)\s*}}/g, (match, place) =>
    values[place]?.trim() ? values[place] : `{{${place}}}`,
  );
  return (
    <div className="rounded-lg bg-page p-3">
      <p className="mb-2 text-xs font-semibold text-text-muted uppercase">Preview</p>
      <div className="ml-auto max-w-[90%] rounded-lg bg-chat-out px-2.5 py-1.5 text-sm shadow-sm">
        {template.headerType === 'TEXT' && template.headerText && (
          <p className="mb-1 font-semibold">{template.headerText}</p>
        )}
        {HEADER_KINDS[template.headerType] &&
          (headerPreview?.imageUrl ? (
            <img src={headerPreview.imageUrl} alt="" className="mb-1 max-h-40 rounded" />
          ) : (
            <p className="mb-1 flex items-center gap-1 rounded bg-surface/60 p-2 text-xs text-text-muted">
              <Megaphone size={12} aria-hidden="true" />
              {headerPreview?.fileName ?? `Header: ${HEADER_KINDS[template.headerType].word}`}
            </p>
          ))}
        <p className="break-words whitespace-pre-wrap">{renderWhatsAppText(text, 'preview')}</p>
        {template.footerText && (
          <p className="mt-1 text-xs text-text-muted">{template.footerText}</p>
        )}
      </div>
      {template.buttons.length > 0 && (
        <div className="mt-1 ml-auto max-w-[90%] space-y-1">
          {template.buttons.map((button) => (
            <p
              key={button.text}
              className="rounded-lg bg-surface py-1 text-center text-sm text-info shadow-sm"
            >
              {button.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Choose an approved template, fill its variables (and its picture, video or document), see
 * how it will look, and send it. The only way to write first, or after the 24 hours.
 * @param {{ open: boolean, conversation: object, actions: object, onClose: () => void }} props
 *        actions: from useChatActions (uploadHeader, sendTemplate)
 */
export default function TemplateDialog({ open, conversation, actions, onClose }) {
  const can = useCan();
  const templates = useTemplates({ enabled: open });
  const [search, setSearch] = useState('');
  const [chosenKey, setChosenKey] = useState('');
  const [values, setValues] = useState({});
  // { kind: 'upload', file, url, fileName, mimeType } or { kind: 'library', id, fileName, mimeType }
  const [header, setHeader] = useState(null);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  const [problem, setProblem] = useState('');
  const { uploadHeader, sendTemplate } = actions;

  const list = templates.data ?? [];
  const shown = list.filter((item) =>
    `${item.name} ${item.category} ${item.language}`.toLowerCase().includes(search.toLowerCase()),
  );
  const template = list.find((item) => `${item.name}|${item.language}` === chosenKey) ?? null;
  const headerKind = template ? HEADER_KINDS[template.headerType] : null;

  // A picture chosen from the computer is shown in the preview from the computer itself.
  const imageUrl = useMemo(
    () =>
      header?.kind === 'upload' && header.mimeType?.startsWith('image/')
        ? URL.createObjectURL(header.file)
        : null,
    [header],
  );
  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  const choose = (item) => {
    setChosenKey(`${item.name}|${item.language}`);
    setValues(startingValues(item, conversation));
    setHeader(null);
    setProblem('');
    sendTemplate.reset();
  };

  const pickFile = async (file) => {
    if (!file) return;
    setProblem('');
    try {
      const kept = (await uploadHeader.mutateAsync(file)).data;
      setHeader({ kind: 'upload', file, ...kept });
    } catch (error) {
      setProblem(error.message);
    }
  };

  const send = () => {
    setProblem('');
    const empty = template.variables.filter((place) => !values[place]?.trim());
    if (empty.length) {
      setProblem(`Fill all ${template.variables.length} variable(s) of the template.`);
      return;
    }
    if (headerKind && !header) {
      setProblem(`This template needs ${headerKind.word}: add one.`);
      return;
    }
    sendTemplate.mutate(
      {
        templateName: template.name,
        language: template.language,
        values,
        ...(header
          ? {
              header:
                header.kind === 'library'
                  ? { documentId: header.id }
                  : { url: header.url, fileName: header.fileName, mimeType: header.mimeType },
            }
          : {}),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog
      open={open}
      title="Send a template"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!template || sendTemplate.isPending || uploadHeader.isPending}
            onClick={send}
          >
            {sendTemplate.isPending ? 'Sending…' : 'Send template'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {conversation.contact && !conversation.contact.whatsappOptIn && (
          <p className="flex items-start gap-2 rounded-md border border-warning p-2 text-sm text-warning">
            <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {conversation.name} has not agreed to WhatsApp messages yet (Accounts → People). Meta
            asks for the customer&apos;s agreement: send only when they expect to hear from us.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <input
              type="search"
              aria-label="Search templates"
              placeholder="Search templates"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={inputClass}
            />
            {templates.isPending && <p className="text-sm text-text-muted">Loading templates…</p>}
            {templates.isSuccess && list.length === 0 && (
              <p className="text-sm text-text-muted">
                No approved template yet. Templates are made in Meta&apos;s WhatsApp Manager and
                show here once Meta approves them (Settings → WhatsApp).
              </p>
            )}
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border empty:hidden">
              {shown.map((item) => {
                const key = `${item.name}|${item.language}`;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-pressed={key === chosenKey}
                      onClick={() => choose(item)}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-page focus-visible:outline-2 focus-visible:outline-brand ${key === chosenKey ? 'bg-page' : ''}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="shrink-0 rounded-full border border-border px-1.5 text-xs">
                          {item.language}
                        </span>
                      </span>
                      <span className="block text-xs text-text-muted capitalize">
                        {item.category.toLowerCase()}
                        {item.headerType && item.headerType !== 'TEXT'
                          ? ` · with ${HEADER_KINDS[item.headerType]?.word ?? 'a header'}`
                          : ''}
                      </span>
                      <span className="line-clamp-2 block text-xs text-text-muted">
                        {item.bodyText}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-3">
            {!template && (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-muted">
                Choose a template on the left.
              </p>
            )}
            {template && (
              <>
                {template.variables.map((place) => (
                  <Field key={place} label={`Variable {{${place}}}`}>
                    {(props) => (
                      <input
                        {...props}
                        value={values[place] ?? ''}
                        maxLength={1000}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [place]: event.target.value }))
                        }
                        className={inputClass}
                      />
                    )}
                  </Field>
                ))}
                {headerKind && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Header: {headerKind.word}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`${secondaryButtonClass} cursor-pointer`}>
                        <headerKind.icon size={16} aria-hidden="true" />
                        {uploadHeader.isPending ? 'Uploading…' : 'From my computer'}
                        <input
                          type="file"
                          accept={headerKind.accept}
                          className="sr-only"
                          onChange={(event) => pickFile(event.target.files?.[0])}
                        />
                      </label>
                      {template.headerType === 'DOCUMENT' && can('documents', 'view') && (
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          onClick={() => setIsPickingDocument((value) => !value)}
                        >
                          <FileText size={16} aria-hidden="true" />
                          From Documents
                        </button>
                      )}
                    </div>
                    {header && (
                      <p className="text-sm text-text-muted">
                        Added: <span className="font-medium text-text">{header.fileName}</span>
                      </p>
                    )}
                    {isPickingDocument && (
                      <div className={`${compactInputClass} max-h-60 overflow-y-auto`}>
                        <DocumentPicker
                          chosen={header?.kind === 'library' ? [{ url: header.url }] : []}
                          onPick={(document) => {
                            setHeader({
                              kind: 'library',
                              id: document.id,
                              url: document.url,
                              fileName: document.filename,
                              mimeType: document.mimeType,
                            });
                            setIsPickingDocument(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <Preview
                  template={template}
                  values={values}
                  headerPreview={header ? { imageUrl, fileName: header.fileName } : null}
                />
              </>
            )}
          </div>
        </div>
        <FormError message={problem || sendTemplate.error?.message || templates.error?.message} />
      </div>
    </Dialog>
  );
}
