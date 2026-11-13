import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Eye, FileText, PencilLine, Save } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import { primaryButtonClass, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useGenerated, useGeneratedActions, useNextRef, useSeal } from '../api.js';
import FieldEditor from '../engine/FieldEditor.jsx';
import { downloadPdf } from '../engine/printDocument.js';
import { setIn, withDefaults } from '../engine/values.js';
import { findTemplate, kindByPath } from '../kinds.js';

const A4_WIDTH_PX = 794; // 210 mm at 96 dpi

/** The A4 preview, zoomed to fit the width of its column. `pages`: the PDF's page count. */
function Preview({ children, previewRef, pages }) {
  const boxRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setZoom(Math.min(1, (entry.contentRect.width - 24) / A4_WIDTH_PX)),
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={boxRef} className="h-full overflow-auto rounded-lg bg-page p-3">
      {pages > 0 && (
        <p
          className="sticky top-0 z-10 mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium shadow-sm"
          aria-live="polite"
        >
          <FileText size={13} className="text-brand" />
          The PDF will have {pages} {pages === 1 ? 'page' : 'pages'} (cover page included)
        </p>
      )}
      <div ref={previewRef} style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}

function TokenHelp({ tokens }) {
  if (!tokens?.length) return null;
  return (
    <details className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold">Words that fill in by themselves</summary>
      <p className="mt-2 text-xs text-text-muted">
        Write these in any text; the document shows the value. **Two stars** around words make them
        bold. Yellow in the preview means a value is still missing.
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {tokens.map(([token, meaning]) => (
          <div key={token} className="contents">
            <dt className="font-mono text-brand-text">{token}</dt>
            <dd className="text-text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** The editor: values on the left, the live document on the right. */
function Editor({ kind, template, id, saved, nextRef }) {
  const navigate = useNavigate();
  const can = useCan();
  const seal = useSeal();
  const { create, update } = useGeneratedActions(kind.path);
  const [data, setData] = useState(() => {
    if (saved) return withDefaults(template.defaults, saved.data);
    const fresh = template.createData();
    // A new document gets the next free reference number; the person may still change it.
    return template.autoRef && nextRef ? setIn(fresh, template.autoRef.path, nextRef) : fresh;
  });
  const [savedJson, setSavedJson] = useState(() => (saved ? JSON.stringify(data) : ''));
  const [updatedAt, setUpdatedAt] = useState(saved?.updatedAt ?? null);
  const [savedAt, setSavedAt] = useState(saved ? new Date(saved.updatedAt) : null);
  const [message, setMessage] = useState('');
  const [view, setView] = useState('form'); // phones: form or preview
  const [confirm, setConfirm] = useState(null); // 'leave' | 'missing'
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);
  const [pages, setPages] = useState(0);
  // The preview follows the typing a moment later, so long content stays smooth to edit.
  const shown = useDeferredValue(data);
  const paged = Boolean(template.pagedPreview);

  const dirty = JSON.stringify(data) !== savedJson;
  const summary = useMemo(() => template.summary(data), [template, data]);
  const mayEdit = id ? can(kind.feature, 'edit') : can(kind.feature, 'create');
  const saving = create.isPending || update.isPending;
  const Document = template.Document;

  // Leaving the page with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    setMessage('');
    const body = {
      title: summary.title,
      refNo: summary.refNo,
      clientName: summary.clientName,
      data,
    };
    try {
      const result = id
        ? await update.mutateAsync({ id, ...body, ...(updatedAt ? { updatedAt } : {}) })
        : await create.mutateAsync({ templateKey: template.key, ...body });
      setSavedJson(JSON.stringify(data));
      setUpdatedAt(result.data.updatedAt);
      setSavedAt(new Date(result.data.updatedAt));
      if (!id) navigate(`/generator/${kind.path}/${result.data.id}`, { replace: true });
    } catch (error) {
      setMessage(error.message);
      // The number was taken by a colleague meanwhile: put in the next free one.
      const free = error.details?.nextRefNo;
      if (error.code === 'REF_TAKEN' && free && template.autoRef) {
        setData((current) => setIn(current, template.autoRef.path, free));
        setMessage(`${error.message} It is filled in now; save again.`);
      }
    }
  };

  const download = async (checked = false) => {
    const element = previewRef.current?.querySelector('[data-doc-root]');
    if (!element) return;
    if (!checked && element.querySelector('mark')) {
      setConfirm('missing');
      return;
    }
    setConfirm(null);
    setMessage('');
    setDownloading(true);
    try {
      await downloadPdf({ element, fileName: summary.fileName, pageCss: template.pageCss(data) });
    } catch (error) {
      setMessage(`The PDF could not be made: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const back = () => (dirty ? setConfirm('leave') : navigate(`/generator/${kind.path}`));

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[520px] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={back}
          className={`${secondaryButtonClass} px-2.5`}
          aria-label={`Back to ${kind.label.toLowerCase()}`}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{summary.title}</h1>
          <p className="truncate text-xs text-text-muted">
            {template.name}
            {summary.clientName ? ` · ${summary.clientName}` : ''} ·{' '}
            {dirty ? (
              <span className="text-warning">Not saved yet</span>
            ) : savedAt ? (
              `Saved ${savedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
            ) : (
              'New'
            )}
          </p>
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => download()}
          disabled={downloading}
        >
          <Download size={16} /> {downloading ? 'Making PDF…' : 'Download PDF'}
        </button>
        {mayEdit && (
          <button
            type="button"
            className={primaryButtonClass}
            onClick={save}
            disabled={saving || (!dirty && Boolean(id))}
          >
            <Save size={16} /> {saving ? 'Saving…' : `Save ${kind.one}`}
          </button>
        )}
      </header>
      {message && (
        <p role="alert" className="rounded-md bg-brand-soft px-3 py-2 text-sm text-danger">
          {message}
        </p>
      )}

      <div className="flex gap-1 lg:hidden" role="tablist" aria-label="Form or preview">
        {[
          ['form', 'Form', PencilLine],
          ['preview', 'Preview', Eye],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
              view === key ? 'border-brand text-brand' : 'border-border text-text-muted'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(340px,440px)_1fr]">
        <div
          className={`min-h-0 space-y-3 overflow-y-auto pr-1 ${view === 'form' ? '' : 'hidden lg:block'}`}
        >
          <TokenHelp tokens={template.tokens} />
          <fieldset disabled={!mayEdit} className="min-w-0">
            <FieldEditor form={template.form} data={data} onChange={setData} />
          </fieldset>
        </div>
        <div className={`min-h-0 ${view === 'preview' ? '' : 'hidden lg:block'}`}>
          <Preview previewRef={paged ? null : previewRef} pages={paged ? pages : 0}>
            <Document data={shown} assets={{ seal }} paged={paged} onPages={setPages} />
          </Preview>
          {paged && (
            // What the PDF is made from: the same document as one flowing sheet, out of sight.
            <div
              aria-hidden="true"
              className="pointer-events-none invisible fixed left-[-10000px] top-0"
            >
              <div ref={previewRef}>
                <Document data={shown} assets={{ seal }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'leave'}
        title="Leave without saving?"
        confirmLabel="Leave"
        onClose={() => setConfirm(null)}
        onConfirm={() => navigate(`/generator/${kind.path}`)}
      >
        Your changes to this {kind.one} are not saved and will be lost.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'missing'}
        title="Some places are not filled"
        confirmLabel="Download anyway"
        onClose={() => setConfirm(null)}
        onConfirm={() => download(true)}
      >
        The places marked in yellow have no value yet and will show in the PDF as they are.
      </ConfirmDialog>
    </div>
  );
}

/** /generator/:kindPath/new?template=… and /generator/:kindPath/:id */
export default function GeneratorEditorPage() {
  const { kindPath, id } = useParams();
  const [params] = useSearchParams();
  const kind = kindByPath(kindPath);
  const isNew = id === 'new';
  const { data, isLoading, error } = useGenerated(kindPath, isNew ? null : id);
  const saved = data?.data;
  const template = findTemplate(
    kind,
    isNew ? (params.get('template') ?? kind?.templates[0]?.key) : saved?.templateKey,
  );

  const nextRef = useNextRef(kindPath, Boolean(isNew && template?.autoRef));

  if (!kind) return <p className="text-danger">This kind of document does not exist.</p>;
  if (nextRef.isLoading) return <p className="text-text-muted">Opening…</p>;
  if (!isNew && isLoading) return <p className="text-text-muted">Opening…</p>;
  if (error) return <p className="text-danger">{error.message}</p>;
  if (!template)
    return <p className="text-danger">The template of this document is not available.</p>;
  // `key`: opening another document starts a fresh editor.
  return (
    <Editor
      key={saved?.id ?? 'new'}
      kind={kind}
      template={template}
      id={isNew ? null : id}
      saved={saved}
      nextRef={nextRef.refNo}
    />
  );
}
