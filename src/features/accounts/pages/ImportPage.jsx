import { useRef, useState } from 'react';
import { ArrowLeft, Download, FileUp, Undo2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import {
  FormError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import {
  isWorking,
  useDeleteTemplate,
  useImport,
  useImportOptions,
  useImports,
  usePreviewImport,
  useStartImport,
  useUndoImport,
  useUploadImport,
} from '../importApi.js';

const STATUS_LABELS = {
  uploaded: 'Columns not chosen yet',
  mapped: 'Checked, not started',
  queued: 'Waiting to start',
  running: 'Running',
  completed: 'Finished',
  failed: 'Stopped',
  undoing: 'Being undone',
  undone: 'Undone',
};
const MODE_LABELS = {
  skip: [
    'Skip',
    'A company that is already in the CRM is left as it is. A new person in the row is still added to it.',
  ],
  update: [
    'Update',
    'A company that is already in the CRM gets the filled-in values of the row. Its name stays.',
  ],
  create: [
    'Always create',
    'Every row becomes a new company, even when one with the same name exists.',
  ],
};
const number = (value) => (value ?? 0).toLocaleString('en-IN');
const formatDateTime = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
// Rows are counted from 1 below the heading row; a spreadsheet shows them one further down.
const sheetRow = (row) => row + 1;

function Counts({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value, tone]) => (
        <div key={label} className="rounded-lg border border-border bg-surface p-3">
          <dt className="text-sm text-text-muted">{label}</dt>
          <dd className={`text-xl font-semibold ${tone ?? ''}`}>{number(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Problems({ title, rows }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
        {rows.map((item) => (
          <li key={item.row} className="flex gap-3 px-3 py-2">
            <span className="shrink-0 font-medium whitespace-nowrap">Row {sheetRow(item.row)}</span>
            <span className="min-w-0 break-words text-text-muted">{item.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Steps 2 and 3: choose a field for each column, check the file, start.
function MappingStep({ item, options, canRun }) {
  const [fieldOf, setFieldOf] = useState(() =>
    Object.fromEntries(item.mapping.map(({ column, field }) => [column, field])),
  );
  const [duplicateMode, setDuplicateMode] = useState(item.duplicateMode);
  const [templateName, setTemplateName] = useState('');
  const preview = usePreviewImport(item.id);
  const start = useStartImport(item.id);
  const deleteTemplate = useDeleteTemplate();

  const mapping = item.headers
    .filter((column) => fieldOf[column])
    .map((column) => ({ column, field: fieldOf[column] }));
  const groups = [...new Set(options.fields.map((field) => field.group))];
  const used = new Set(Object.values(fieldOf).filter(Boolean));

  // Any change makes the last check out of date.
  const change = (apply) => {
    apply();
    preview.reset();
    start.reset();
  };
  function applyTemplate(id) {
    const template = options.templates.find((entry) => entry.id === id);
    if (!template) return;
    change(() =>
      setFieldOf(
        Object.fromEntries(
          template.mapping
            .filter(({ column }) => item.headers.includes(column))
            .map(({ column, field }) => [column, field]),
        ),
      ),
    );
  }

  const columns = [
    { key: 'column', header: 'Column in the file', render: (row) => row.column },
    {
      key: 'sample',
      header: 'First values',
      className: 'text-text-muted',
      render: (row) =>
        item.sampleRows
          .map((cells) => cells[row.index])
          .filter(Boolean)
          .slice(0, 3)
          .join(' · ') || '—',
    },
    {
      key: 'field',
      header: 'Goes into',
      render: (row) => (
        <select
          aria-label={`Field for ${row.column}`}
          value={fieldOf[row.column] ?? ''}
          disabled={!canRun}
          onChange={(event) =>
            change(() => setFieldOf({ ...fieldOf, [row.column]: event.target.value }))
          }
          className={`${inputClass} min-w-48`}
        >
          <option value="">Do not import</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {options.fields
                .filter((field) => field.group === group)
                .map((field) => (
                  <option
                    key={field.field}
                    value={field.field}
                    disabled={used.has(field.field) && fieldOf[row.column] !== field.field}
                  >
                    {field.label}
                    {field.required ? ' (needed)' : ''}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      ),
    },
  ];

  const checked = preview.data?.data;
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold">1. Which column is what?</h2>
            <p className="text-sm text-text-muted">
              A first guess is made from the headings. Each row is one company and, when the file
              names one, a person at it.
            </p>
          </div>
          {options.templates.length > 0 && canRun && (
            <div className="flex items-center gap-2">
              <select
                aria-label="Use a saved mapping"
                value=""
                onChange={(event) => applyTemplate(event.target.value)}
                className={`${inputClass} w-auto`}
              >
                <option value="">Use a saved mapping…</option>
                {options.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DataTable
          caption="Columns of the file"
          columns={columns}
          rows={item.headers.map((column, index) => ({ id: column, column, index }))}
        />
      </section>

      <fieldset className="space-y-2">
        <legend className="font-semibold">2. When a company is already in the CRM</legend>
        <p className="text-sm text-text-muted">
          A company counts as the same when its name, phone or email matches.
        </p>
        {options.duplicateModes.map((mode) => (
          <label key={mode} className="flex items-start gap-2">
            <input
              type="radio"
              name="duplicateMode"
              className="mt-1 size-4 accent-brand"
              checked={duplicateMode === mode}
              disabled={!canRun}
              onChange={() => change(() => setDuplicateMode(mode))}
            />
            <span>
              <span className="font-medium">{MODE_LABELS[mode][0]}</span>
              <span className="block text-sm text-text-muted">{MODE_LABELS[mode][1]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {canRun && (
        <section className="space-y-3">
          <h2 className="font-semibold">3. Check, then import</h2>
          <FormError message={preview.error?.message ?? start.error?.message} />
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={mapping.length === 0 || preview.isPending}
            onClick={() => preview.mutate({ mapping, duplicateMode })}
          >
            {preview.isPending ? 'Checking every row…' : 'Check the file'}
          </button>

          {checked && (
            <div className="space-y-3">
              <Counts
                items={[
                  ['Rows', checked.counts.total],
                  ['New companies', checked.counts.newCompanies, 'text-success'],
                  // In the CRM today, or created by an earlier row of this same file.
                  ['Already there', checked.counts.existing],
                  [
                    'Rows with a problem',
                    checked.counts.invalid,
                    checked.counts.invalid > 0 ? 'text-danger' : '',
                  ],
                ]}
              />
              <p className="text-sm text-text-muted">
                {number(checked.counts.people)} rows name a person. Nothing has been saved yet. Rows
                with a problem are left out and listed in a file after the import.
              </p>
              <Problems
                title={
                  checked.counts.invalid > checked.problems.length
                    ? `First ${checked.problems.length} rows with a problem`
                    : 'Rows with a problem'
                }
                rows={checked.problems}
              />
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  <span className="mb-1 block text-text-muted">
                    Save this mapping as (optional)
                  </span>
                  <input
                    value={templateName}
                    maxLength={60}
                    placeholder="For example: Expo list"
                    onChange={(event) => setTemplateName(event.target.value)}
                    className={`${inputClass} w-64`}
                  />
                </label>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={checked.counts.valid === 0 || start.isPending}
                  onClick={() =>
                    start.mutate({
                      mapping,
                      duplicateMode,
                      ...(templateName.trim() ? { saveTemplateAs: templateName.trim() } : {}),
                    })
                  }
                >
                  {start.isPending
                    ? 'Starting…'
                    : `Import ${number(checked.counts.valid)} ${checked.counts.valid === 1 ? 'row' : 'rows'}`}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {options.templates.length > 0 && canRun && (
        <section className="text-sm">
          <h3 className="mb-1 font-semibold">Saved mappings</h3>
          <ul className="flex flex-wrap gap-2">
            {options.templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1"
              >
                {template.name}
                <button
                  type="button"
                  className="text-text-muted hover:text-danger"
                  aria-label={`Delete saved mapping ${template.name}`}
                  disabled={deleteTemplate.isPending}
                  onClick={() => deleteTemplate.mutate(template.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Steps 4 and 5: progress while it runs, then the result with the error file and undo.
function Result({ item, canRun }) {
  const undo = useUndoImport(item.id);
  const [isConfirming, setIsConfirming] = useState(false);
  const percent = item.rowCount ? Math.round((item.processedRows / item.rowCount) * 100) : 0;
  const canUndo = canRun && ['completed', 'failed'].includes(item.status);

  return (
    <div className="space-y-4">
      {isWorking(item.status) && (
        <section role="status" className="space-y-2">
          <p className="font-medium">
            {item.status === 'undoing'
              ? 'Removing what this import created…'
              : `Importing: ${number(item.processedRows)} of ${number(item.rowCount)} rows`}
          </p>
          {item.status !== 'undoing' && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 overflow-hidden rounded-full bg-border"
            >
              <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
            </div>
          )}
          <p className="text-sm text-text-muted">
            This runs in the background. You can leave this page and come back.
          </p>
        </section>
      )}

      {item.status === 'failed' && <FormError message={item.failureReason} />}
      {item.status === 'undone' && item.undo && (
        <p role="status" className="rounded-md border border-border bg-surface p-3">
          Undone: {number(item.undo.accountsRemoved)} companies and{' '}
          {number(item.undo.contactsRemoved)} people were removed.
          {item.undo.kept > 0 &&
            ` ${number(item.undo.kept)} could not be removed (still in use, or not yours to delete) and were kept.`}
        </p>
      )}

      <Counts
        items={[
          ['New companies', item.counts.created, 'text-success'],
          ['Existing, changed', item.counts.updated],
          ['Skipped', item.counts.skipped],
          ['Failed', item.counts.failed, item.counts.failed > 0 ? 'text-danger' : ''],
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {item.errorFileLink && (
          <a href={item.errorFileLink} className={secondaryButtonClass} download>
            <Download size={16} aria-hidden="true" />
            Download the failed rows
          </a>
        )}
        {item.status === 'completed' && (
          <Link to="/accounts?sort=-createdAt" className={secondaryButtonClass}>
            See the accounts
          </Link>
        )}
        {canUndo && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              undo.reset();
              setIsConfirming(true);
            }}
          >
            <Undo2 size={16} aria-hidden="true" />
            Undo this import
          </button>
        )}
      </div>

      <Problems
        title={
          item.counts.failed > item.rowErrors.length
            ? `First ${item.rowErrors.length} failed rows`
            : 'Failed rows'
        }
        rows={item.rowErrors}
      />

      <ConfirmDialog
        open={isConfirming}
        title="Undo this import?"
        confirmLabel="Undo import"
        isBusy={undo.isPending}
        error={undo.error?.message}
        onClose={() => setIsConfirming(false)}
        onConfirm={() => undo.mutate(undefined, { onSuccess: () => setIsConfirming(false) })}
      >
        <p>
          The {number(item.counts.created)} companies this import created, and the people it added,
          will be removed. Companies it only changed stay as they are now.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function OneImport({ id, options, canRun, onBack }) {
  const current = useImport(id);
  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      All imports
    </button>
  );
  if (current.isPending) {
    return (
      <>
        {backButton}
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      </>
    );
  }
  if (current.isError) {
    return (
      <>
        {backButton}
        <FormError
          message={
            current.error.status === 404
              ? 'This import does not exist, or it is not one of yours.'
              : current.error.message
          }
        />
      </>
    );
  }
  const item = current.data;
  const isOpen = ['uploaded', 'mapped'].includes(item.status);
  return (
    <>
      {backButton}
      <header className="mb-4">
        <h2 className="text-lg font-semibold break-words">{item.fileName}</h2>
        <p className="text-sm text-text-muted">
          {number(item.rowCount)} rows · {STATUS_LABELS[item.status]} · uploaded by{' '}
          {item.createdBy.name ?? 'someone'} on {formatDateTime(item.createdAt)}
        </p>
      </header>
      {isOpen ? (
        <MappingStep key={item.id} item={item} options={options} canRun={canRun} />
      ) : (
        <Result item={item} canRun={canRun} />
      )}
    </>
  );
}

function History({ onOpen }) {
  const [page, setPage] = useState(1);
  const imports = useImports(page);
  const rows = imports.data?.data ?? [];
  const columns = [
    {
      key: 'file',
      header: 'File',
      render: (row) => (
        <>
          <button
            type="button"
            onClick={() => onOpen(row.id)}
            className="text-left font-medium break-all hover:text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {row.fileName}
          </button>
          <p className="text-text-muted">{number(row.rowCount)} rows</p>
        </>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => STATUS_LABELS[row.status] },
    {
      key: 'result',
      header: 'Result',
      className: 'text-text-muted',
      render: (row) =>
        row.processedRows === 0
          ? '—'
          : `${number(row.counts.created)} new · ${number(row.counts.updated)} changed · ${number(row.counts.skipped)} skipped · ${number(row.counts.failed)} failed`,
    },
    { key: 'by', header: 'By', render: (row) => row.createdBy.name ?? '—' },
    {
      key: 'when',
      header: 'Uploaded',
      className: 'whitespace-nowrap text-text-muted',
      render: (row) => formatDateTime(row.createdAt),
    },
  ];
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Earlier imports</h2>
      <FormError message={imports.error?.message} />
      {imports.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          No file has been imported yet.
        </p>
      )}
      {rows.length > 0 && <DataTable caption="Earlier imports" columns={columns} rows={rows} />}
      <Pagination meta={imports.data?.meta} noun={['import', 'imports']} onPageChange={setPage} />
    </section>
  );
}

// Accounts → Import: bring companies and their people in from a CSV file.
// The import being looked at is kept in the address (?import=…), so a reload stays on it.
export default function ImportPage() {
  const can = useCan();
  const canRun = can('imports', 'create');
  const [searchParams, setSearchParams] = useSearchParams();
  const importId = searchParams.get('import');
  const options = useImportOptions();
  const upload = useUploadImport();
  const fileInput = useRef(null);
  const open = (id) => setSearchParams(id ? { import: id } : {});

  const limits = options.data?.limits;
  const noStorage = options.data?.storage === 'not_configured';

  return (
    <>
      <Link
        to="/accounts"
        className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All accounts
      </Link>
      <PageHeader
        title="Import accounts"
        description="Bring companies and their people in from a CSV file."
      />
      <FormError message={options.error?.message} />

      {importId && options.isSuccess && (
        <OneImport
          key={importId}
          id={importId}
          options={options.data}
          canRun={canRun}
          onBack={() => open(null)}
        />
      )}

      {!importId && (
        <div className="space-y-6">
          {canRun && (
            <section className="rounded-lg border border-dashed border-border bg-surface p-5">
              <h2 className="font-semibold">Upload a CSV file</h2>
              <p className="mt-1 max-w-2xl text-sm text-text-muted">
                The first row must hold the column headings. In Excel or Google Sheets, save the
                sheet as “CSV UTF-8”.
                {limits &&
                  ` Up to ${number(limits.maxRows)} rows and ${limits.maxBytes / 1024 / 1024} MB per file.`}{' '}
                Nothing is saved until you have checked the file and pressed Import.
              </p>
              {noStorage && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  File storage is not set up yet, so files cannot be imported.
                </p>
              )}
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                aria-label="CSV file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Cleared, so choosing the same file again is noticed.
                  event.target.value = '';
                  if (file) {
                    upload.mutate(file, { onSuccess: (payload) => open(payload.data.id) });
                  }
                }}
              />
              <button
                type="button"
                className={`${primaryButtonClass} mt-3`}
                disabled={upload.isPending || noStorage}
                onClick={() => fileInput.current?.click()}
              >
                <FileUp size={16} aria-hidden="true" />
                {upload.isPending ? 'Uploading…' : 'Choose a file'}
              </button>
              <div className="mt-2">
                <FormError message={upload.error?.message} />
              </div>
            </section>
          )}
          <History onOpen={open} />
        </div>
      )}
    </>
  );
}
