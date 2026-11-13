import { applyAccount } from '../shared/clientFromAccount.js';

// The form of the simple proposal (founder, 2026-11-13): the same fields as before for the
// cover page, the acceptance and the footer; one box for the whole proposal in between.

export const SIMPLE_FORM = [
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
        placeholder: 'ENGENX-DMA-2026-101',
        hint: 'Filled in with the next free number; you can change it.',
      },
      { path: 'meta.date', label: 'Proposal date (optional)', type: 'date' },
      { path: 'meta.runningTitle', label: 'Title in the page header', type: 'text' },
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
      {
        path: 'facts.duration',
        label: 'Duration',
        type: 'text',
        placeholder: 'e.g. 8 working days',
      },
      { path: 'provider.name', label: 'Prepared by', type: 'text' },
      { path: 'provider.location', label: 'Prepared by: location', type: 'text' },
    ],
  },
  {
    id: 'content',
    title: 'Proposal content',
    intro:
      'Paste the proposal from ChatGPT (or Word, Google Docs): headings, bold, lists and tables stay as they are. Its sections come after the cover page; Acceptance follows at the end.',
    fields: [
      {
        path: 'content.html',
        label: 'Proposal content',
        type: 'richtext',
        placeholder: 'Paste the proposal here…',
      },
    ],
  },
  {
    id: 'acceptance',
    title: 'Acceptance and signatures',
    fields: [
      { path: 'acceptance.title', label: 'Heading', type: 'text' },
      { path: 'acceptance.text', label: 'Text', type: 'textarea', rows: 2 },
      { path: 'acceptance.providerName', label: 'Signs for EngenX', type: 'text' },
      { path: 'acceptance.providerTitle', label: 'Designation', type: 'text' },
      {
        path: 'acceptance.showSeal',
        label: 'Put the company seal and signature',
        type: 'toggle',
        hint: 'Leave it off for a draft you send for comments.',
      },
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
