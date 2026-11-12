import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Field, inputClass } from '../../../components/shared/form.jsx';
import { getIn, setIn } from './values.js';

// The left side of the generator: a form drawn from a template's list of fields, so a new
// template (letter head, invoice …) needs no new form code. Field types:
//   text, textarea, number, money, date, toggle            one value at `path`
//   strings                                                a list of lines (add, move, remove)
//   rows   (columns: [{ key, label, type, placeholder }])  a list of small records, e.g. table rows
// A group with `section` gets "Show this section" and "Start on a new page" switches.

const smallButton =
  'inline-flex items-center justify-center rounded-md p-1 text-text-muted hover:bg-page hover:text-text ' +
  'disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand';
const addButton =
  'inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs ' +
  'font-medium text-text-muted hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-brand';

const move = (list, from, to) => {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

function ListControls({ index, count, onMove, onRemove, label }) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        className={smallButton}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label={`Move ${label} up`}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        className={smallButton}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label={`Move ${label} down`}
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        className={smallButton}
        onClick={() => onRemove(index)}
        aria-label={`Remove ${label}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function TextInput({ field, value, onChange, props = {} }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        {...props}
        rows={field.rows ?? 3}
        className={`${inputClass} text-sm`}
        value={value ?? ''}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  const numeric = field.type === 'number' || field.type === 'money';
  return (
    <input
      {...props}
      type={numeric ? 'number' : field.type === 'date' ? 'date' : 'text'}
      min={numeric ? 0 : undefined}
      step={field.type === 'money' ? '0.01' : undefined}
      className={`${inputClass} text-sm`}
      value={value ?? ''}
      placeholder={field.placeholder}
      onChange={(event) =>
        onChange(
          numeric
            ? event.target.value === ''
              ? ''
              : Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

function StringsEditor({ field, value = [], onChange }) {
  const label = field.itemLabel ?? 'line';
  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex items-start gap-1">
          <span className="mt-2 w-5 shrink-0 text-right text-xs text-text-muted">{index + 1}.</span>
          <textarea
            rows={field.rows ?? 2}
            aria-label={`${field.label} ${index + 1}`}
            className={`${inputClass} text-sm`}
            value={item}
            onChange={(event) =>
              onChange(value.map((old, at) => (at === index ? event.target.value : old)))
            }
          />
          <ListControls
            index={index}
            count={value.length}
            label={label}
            onMove={(from, to) => onChange(move(value, from, to))}
            onRemove={(at) => onChange(value.filter((_, position) => position !== at))}
          />
        </div>
      ))}
      <button type="button" className={addButton} onClick={() => onChange([...value, ''])}>
        <Plus size={12} /> Add {label}
      </button>
    </div>
  );
}

function RowsEditor({ field, value = [], onChange }) {
  const label = field.itemLabel ?? 'row';
  const blank = Object.fromEntries(
    field.columns.map((column) => [column.key, column.type === 'number' ? 0 : '']),
  );
  const change = (index, key, next) =>
    onChange(value.map((row, at) => (at === index ? { ...row, [key]: next } : row)));
  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div key={index} className="rounded-md border border-border bg-page p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">
              {field.itemTitle ? field.itemTitle(row, index) : `${label} ${index + 1}`}
            </span>
            <ListControls
              index={index}
              count={value.length}
              label={label}
              onMove={(from, to) => onChange(move(value, from, to))}
              onRemove={(at) => onChange(value.filter((_, position) => position !== at))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field.columns.map((column) => (
              <div
                key={column.key}
                className={column.wide || column.type === 'textarea' ? 'col-span-2' : ''}
              >
                <label className="mb-0.5 block text-xs text-text-muted">
                  {column.label}
                  <TextInput
                    field={{ ...column, rows: column.rows ?? 2 }}
                    value={row[column.key]}
                    onChange={(next) => change(index, column.key, next)}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className={addButton}
        onClick={() => onChange([...value, { ...blank, ...(field.newRow ?? {}) }])}
      >
        <Plus size={12} /> Add {label}
      </button>
    </div>
  );
}

function OneField({ field, data, onChange }) {
  const value = getIn(data, field.path);
  const set = (next) => onChange(setIn(data, field.path, next));
  if (field.type === 'toggle') {
    return (
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 accent-brand"
          checked={Boolean(value)}
          onChange={(event) => set(event.target.checked)}
        />
        <span>
          {field.label}
          {field.hint && <span className="block text-xs text-text-muted">{field.hint}</span>}
        </span>
      </label>
    );
  }
  if (field.type === 'strings' || field.type === 'rows') {
    return (
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{field.label}</legend>
        {field.hint && <p className="mb-2 text-xs text-text-muted">{field.hint}</p>}
        {field.type === 'strings' ? (
          <StringsEditor field={field} value={value} onChange={set} />
        ) : (
          <RowsEditor field={field} value={value} onChange={set} />
        )}
      </fieldset>
    );
  }
  return (
    <Field label={field.label} hint={field.hint}>
      {(props) => <TextInput field={field} value={value} onChange={set} props={props} />}
    </Field>
  );
}

function Group({ group, data, onChange, open, onToggle }) {
  const sectionPath = group.section ? `sections.${group.section}` : null;
  const enabled = sectionPath ? getIn(data, `${sectionPath}.enabled`) !== false : true;
  return (
    <section className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span
          className={`flex-1 text-sm font-semibold ${enabled ? '' : 'text-text-muted line-through'}`}
        >
          {group.title}
        </span>
        {group.badge && <span className="text-xs text-text-muted">{group.badge(data)}</span>}
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          {sectionPath && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-md bg-page px-3 py-2">
              <OneField
                field={{
                  path: `${sectionPath}.enabled`,
                  type: 'toggle',
                  label: 'Show this section',
                }}
                data={setIn(data, `${sectionPath}.enabled`, enabled)}
                onChange={onChange}
              />
              <OneField
                field={{
                  path: `${sectionPath}.newPage`,
                  type: 'toggle',
                  label: 'Start on a new page',
                }}
                data={data}
                onChange={onChange}
              />
            </div>
          )}
          {group.intro && <p className="text-xs text-text-muted">{group.intro}</p>}
          {group.fields.map((field) => (
            <OneField key={field.path} field={field} data={data} onChange={onChange} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The whole form of a template.
 * @param {{ form: object[], data: object, onChange: (data: object) => void }} props
 */
export default function FieldEditor({ form, data, onChange }) {
  const [open, setOpen] = useState(() => new Set([form[0]?.id]));
  const toggle = (id) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="space-y-3">
      {form.map((group) => (
        <Group
          key={group.id}
          group={group}
          data={data}
          onChange={onChange}
          open={open.has(group.id)}
          onToggle={() => toggle(group.id)}
        />
      ))}
    </div>
  );
}
