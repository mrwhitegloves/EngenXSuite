import { applyAccount } from '../shared/clientFromAccount.js';

// The form of the assessment proposal: one group per part of the document. Field types are
// explained in engine/FieldEditor.jsx.

const S = (key, field) => ({ ...field, path: `sections.${key}.${field.path}` });

const titleField = (key) => S(key, { path: 'title', label: 'Heading', type: 'text' });

export const ASSESSMENT_FORM = [
  {
    id: 'client',
    title: 'Client and document',
    fields: [
      {
        path: 'client.accountId',
        label: 'Pick the client from Accounts',
        type: 'account',
        hint: 'Fills the name and location below; you can still change them.',
        apply: applyAccount,
        selectedName: (data) => data.client?.name ?? '',
      },
      {
        path: 'client.name',
        label: 'Client company (full legal name)',
        type: 'text',
        placeholder: 'e.g. Sripathi Paper and Boards Pvt. Ltd.',
      },
      { path: 'client.shortName', label: 'Short name (used inside sentences)', type: 'text' },
      {
        path: 'client.location',
        label: 'Client location',
        type: 'text',
        placeholder: 'e.g. Tamil Nadu, India',
      },
      { path: 'client.plantLocation', label: 'Plant location (short)', type: 'text' },
      {
        path: 'meta.docRef',
        label: 'Document reference',
        type: 'text',
        placeholder: 'ENGENX-XXX-DMA-2026-001',
      },
      { path: 'meta.date', label: 'Proposal date (optional)', type: 'date' },
      { path: 'meta.runningTitle', label: 'Title in the page header', type: 'text' },
    ],
  },
  {
    id: 'commercial',
    title: 'Fee, time and scale',
    intro: 'These numbers appear in many places of the proposal through tokens such as {fee}.',
    fields: [
      { path: 'fee.amount', label: 'Professional fee (₹, without GST)', type: 'money' },
      { path: 'fee.gstText', label: 'Text after the fee on the cover', type: 'text' },
      {
        path: 'facts.duration',
        label: 'Duration',
        type: 'text',
        placeholder: 'e.g. 8 working days',
      },
      { path: 'facts.siteDays', label: 'Days at the client plant', type: 'text' },
      {
        path: 'facts.assetCount',
        label: 'Number of assets',
        type: 'text',
        placeholder: 'e.g. ~290',
      },
      { path: 'facts.criticalAssets', label: 'Critical assets checked on site', type: 'text' },
    ],
  },
  {
    id: 'cover',
    title: 'Cover page',
    fields: [
      { path: 'cover.eyebrow', label: 'Line above the title', type: 'text' },
      { path: 'cover.kicker', label: 'Second line', type: 'text' },
      { path: 'cover.title', label: 'Title', type: 'text' },
      { path: 'cover.summary', label: 'Summary', type: 'textarea' },
      { path: 'provider.name', label: 'Prepared by', type: 'text' },
      { path: 'provider.location', label: 'Prepared by: location', type: 'text' },
    ],
  },
  {
    id: 'glance',
    section: 'glance',
    title: 'At a glance',
    fields: [
      titleField('glance'),
      S('glance', { path: 'text', label: 'What we will do', type: 'textarea' }),
      S('glance', {
        path: 'rows',
        label: 'Facts table',
        type: 'rows',
        itemLabel: 'fact',
        columns: [
          { key: 'label', label: 'Label' },
          { key: 'value', label: 'Text', type: 'textarea', rows: 2 },
        ],
      }),
    ],
  },
  {
    id: 'why',
    section: 'why',
    title: 'Why this assessment',
    fields: [
      titleField('why'),
      S('why', { path: 'intro', label: 'Opening sentence', type: 'textarea', rows: 2 }),
      S('why', {
        path: 'problems',
        label: 'Problems',
        type: 'rows',
        itemLabel: 'problem',
        columns: [
          { key: 'title', label: 'Problem (bold)', wide: true },
          { key: 'text', label: 'Explanation', wide: true },
        ],
      }),
      S('why', { path: 'lead', label: 'Paragraph before the questions', type: 'textarea' }),
      S('why', {
        path: 'questions',
        label: 'Questions we answer',
        type: 'strings',
        itemLabel: 'question',
        rows: 1,
      }),
    ],
  },
  {
    id: 'deliverables',
    section: 'deliverables',
    title: 'Deliverables',
    badge: (data) => `${data.sections?.deliverables?.items?.length ?? 0} items`,
    fields: [
      titleField('deliverables'),
      S('deliverables', { path: 'intro', label: 'Opening sentence', type: 'textarea', rows: 2 }),
      S('deliverables', {
        path: 'items',
        label: 'Deliverables table',
        type: 'rows',
        itemLabel: 'deliverable',
        itemTitle: (row, index) => `${row.code || `D${index + 1}`} ${row.name || ''}`,
        columns: [
          { key: 'code', label: 'No.' },
          { key: 'format', label: 'Format' },
          { key: 'name', label: 'Deliverable', wide: true },
          { key: 'what', label: 'What it tells you', type: 'textarea' },
        ],
      }),
      S('deliverables', {
        path: 'notes',
        label: 'Notes under the table',
        type: 'rows',
        itemLabel: 'note',
        columns: [
          { key: 'title', label: 'Bold start', wide: true },
          { key: 'text', label: 'Text', type: 'textarea' },
        ],
      }),
      S('deliverables', {
        path: 'areasIntro',
        label: 'Sentence before the scored areas',
        type: 'textarea',
        rows: 2,
      }),
      S('deliverables', {
        path: 'areas',
        label: 'Scored areas',
        type: 'strings',
        itemLabel: 'area',
        rows: 1,
      }),
    ],
  },
  {
    id: 'process',
    section: 'process',
    title: 'How we work (stages)',
    fields: [
      titleField('process'),
      S('process', {
        path: 'stages',
        label: 'Stages',
        type: 'rows',
        itemLabel: 'stage',
        itemTitle: (row, index) => row.stage || `Stage ${index + 1}`,
        columns: [
          { key: 'stage', label: 'Stage' },
          { key: 'time', label: 'Time' },
          { key: 'where', label: 'Where', wide: true },
          { key: 'what', label: 'What happens', type: 'textarea' },
          { key: 'output', label: 'Output', wide: true },
        ],
      }),
      S('process', { path: 'note', label: 'Note under the table', type: 'textarea', rows: 2 }),
    ],
  },
  {
    id: 'method',
    section: 'method',
    title: 'How we investigate',
    fields: [
      titleField('method'),
      S('method', { path: 'intro', label: 'Opening sentence', type: 'textarea', rows: 2 }),
      S('method', { path: 'checklistTitle', label: 'Checklist heading', type: 'text' }),
      S('method', {
        path: 'checklist',
        label: 'Checklist (in order)',
        type: 'strings',
        itemLabel: 'step',
      }),
      S('method', { path: 'checklistNote', label: 'Note after the checklist', type: 'textarea' }),
      S('method', { path: 'chainTitle', label: 'Chain heading', type: 'text' }),
      S('method', {
        path: 'chain',
        label: 'Chain links (left to right)',
        type: 'strings',
        itemLabel: 'link',
        rows: 1,
      }),
      S('method', { path: 'chainNote', label: 'Note after the chain', type: 'textarea' }),
      S('method', { path: 'evidence', label: 'Highlighted note', type: 'textarea' }),
    ],
  },
  {
    id: 'needs',
    section: 'needs',
    title: 'What we need from the client',
    fields: [
      titleField('needs'),
      S('needs', { path: 'intro', label: 'Opening sentence', type: 'textarea', rows: 2 }),
      S('needs', { path: 'items', label: 'Items', type: 'strings', itemLabel: 'item' }),
      S('needs', { path: 'note', label: 'Note', type: 'textarea', rows: 2 }),
    ],
  },
  {
    id: 'fee',
    section: 'fee',
    title: 'Fee and payment',
    intro: 'The payment amounts are worked out from the fee and the percentages.',
    badge: (data) => {
      const total = (data.sections?.fee?.milestones ?? []).reduce(
        (sum, row) => sum + (Number(row.percent) || 0),
        0,
      );
      return total === 100 ? '' : `Payments add up to ${total}%`;
    },
    fields: [
      titleField('fee'),
      S('fee', {
        path: 'items',
        label: 'Fee table',
        type: 'rows',
        itemLabel: 'line',
        columns: [
          { key: 'item', label: 'Item', type: 'textarea', rows: 2 },
          { key: 'amount', label: 'Amount', wide: true },
        ],
      }),
      S('fee', { path: 'paymentTitle', label: 'Payment heading', type: 'text' }),
      S('fee', {
        path: 'milestones',
        label: 'Payments',
        type: 'rows',
        itemLabel: 'payment',
        newRow: { percent: 0 },
        columns: [
          { key: 'percent', label: 'Percent of the fee', type: 'number' },
          { key: 'when', label: 'When', wide: true },
        ],
      }),
    ],
  },
  {
    id: 'scope',
    section: 'scope',
    title: 'Scope boundaries',
    fields: [
      titleField('scope'),
      S('scope', { path: 'included', label: 'Included', type: 'strings', itemLabel: 'item' }),
      S('scope', { path: 'excluded', label: 'Not included', type: 'strings', itemLabel: 'item' }),
      S('scope', { path: 'notesTitle', label: 'Notes heading', type: 'text' }),
      S('scope', { path: 'notes', label: 'Notes', type: 'strings', itemLabel: 'note' }),
    ],
  },
  {
    id: 'after',
    section: 'after',
    title: 'After the assessment',
    fields: [
      titleField('after'),
      S('after', { path: 'text', label: 'Text', type: 'textarea', rows: 5 }),
    ],
  },
  {
    id: 'acceptance',
    section: 'acceptance',
    title: 'Acceptance and signatures',
    fields: [
      titleField('acceptance'),
      S('acceptance', { path: 'text', label: 'Text', type: 'textarea', rows: 2 }),
      S('acceptance', { path: 'providerName', label: 'Signs for EngenX', type: 'text' }),
      S('acceptance', { path: 'providerTitle', label: 'Designation', type: 'text' }),
      S('acceptance', {
        path: 'showSeal',
        label: 'Put the company seal and signature',
        type: 'toggle',
        hint: 'Leave it off for a draft you send for comments.',
      }),
    ],
  },
  {
    id: 'footer',
    title: 'Last page footer',
    fields: [
      { path: 'provider.contactLine', label: 'Contact line', type: 'text' },
      { path: 'footer.confidentiality', label: 'Confidentiality note', type: 'textarea', rows: 3 },
    ],
  },
];
