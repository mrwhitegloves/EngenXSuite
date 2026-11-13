import engenxAssessment from './templates/engenxAssessment/index.js';
import engenxSimple from './templates/engenxSimple/index.js';

// The kinds of the Document generator and their templates (founder, 2026-11-12). A new template
// is one folder under templates/ (see templates/engenxAssessment/index.js) added to its kind
// here. `feature` is the permission feature the server checks for the kind; `path` is both the
// screen address and the API address.

export const DOC_KINDS = [
  {
    key: 'proposal',
    path: 'proposals',
    label: 'Proposals',
    one: 'proposal',
    feature: 'proposals',
    templates: [engenxSimple],
    // The long assessment template (2026-11-12) is no longer offered (founder, 2026-11-13); it
    // stays so that proposals saved with it still open.
    retiredTemplates: [engenxAssessment],
  },
  {
    key: 'letterhead',
    path: 'letterheads',
    label: 'Letter heads',
    one: 'letter head',
    feature: 'documents',
    templates: [],
  },
  {
    key: 'invoice',
    path: 'invoices',
    label: 'Invoices',
    one: 'invoice',
    feature: 'invoices',
    templates: [],
  },
];

export const kindByPath = (path) => DOC_KINDS.find((kind) => kind.path === path) ?? null;

/** A template of the kind by key; a retired one is found too (to open old documents). */
export const findTemplate = (kind, key) =>
  [...(kind?.templates ?? []), ...(kind?.retiredTemplates ?? [])].find(
    (template) => template.key === key,
  ) ?? null;
