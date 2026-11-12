// Small pure helpers of the Document generator: reading and changing a value deep inside a
// template's data by its path ("fee.amount", "sections.why.problems"), money in Indian format,
// and filling {tokens} in text.

/** The value at a dotted path, or undefined. */
export function getIn(object, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), object);
}

/** A copy of `object` with the value at the dotted path replaced. The original is not changed. */
export function setIn(object, path, value) {
  const [key, ...rest] = path.split('.');
  const current = object ?? {};
  const copy = Array.isArray(current) ? [...current] : { ...current };
  copy[key] = rest.length ? setIn(current[key], rest.join('.'), value) : value;
  return copy;
}

const RUPEES = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** 75000 → "₹75,000"; 37500.5 → "₹37,500.5"; empty → "". */
export function formatRupees(amount) {
  const number = Number(amount);
  if (amount === '' || amount == null || !Number.isFinite(number)) return '';
  return `₹${RUPEES.format(number)}`;
}

/** "2026-11-12" → "12 November 2026" (India). */
export function formatLongDate(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) return '';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const TOKEN = /\{([a-zA-Z][\w.]*)\}/g;

/**
 * Splits text into plain pieces and {tokens}. A known token becomes its value; an unknown one or
 * one without a value is marked `missing`, so the preview can highlight it.
 * @returns {{ text: string, missing?: boolean }[]}
 */
export function fillParts(text, vars) {
  const parts = [];
  let last = 0;
  for (const match of String(text ?? '').matchAll(TOKEN)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const value = vars[match[1]];
    if (value === undefined || value === '') parts.push({ text: match[0], missing: true });
    else parts.push({ text: String(value) });
    last = match.index + match[0].length;
    // "Prepared for {client}." with a name ending in "Ltd." gives one full stop, not two.
    if (String(value ?? '').endsWith('.') && text[last] === '.') last += 1;
  }
  if (last < String(text ?? '').length) parts.push({ text: String(text).slice(last) });
  return parts;
}

/** The text with every known token filled (unknown ones stay as typed). */
export function fillText(text, vars) {
  return fillParts(text, vars)
    .map((part) => part.text)
    .join('');
}

/** A deep copy of plain JSON data. */
export const cloneData = (data) => JSON.parse(JSON.stringify(data));

/**
 * Saved values on top of a template's defaults, so a document saved before the template got a
 * new field still opens with that field. Lists are taken as saved (a removed row stays removed).
 */
export function withDefaults(defaults, saved) {
  if (saved === undefined) return cloneData(defaults);
  const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
  if (!isObject(defaults) || !isObject(saved)) return saved;
  const merged = cloneData(defaults);
  for (const [key, value] of Object.entries(saved)) {
    merged[key] = key in defaults ? withDefaults(defaults[key], value) : value;
  }
  return merged;
}
