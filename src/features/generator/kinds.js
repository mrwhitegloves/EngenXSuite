import engenxAssessment from './templates/engenxAssessment/index.js';

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
    templates: [engenxAssessment],
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

export const findTemplate = (kind, key) =>
  kind?.templates.find((template) => template.key === key) ?? null;
