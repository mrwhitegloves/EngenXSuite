import { formatLongDate, formatRupees } from '../../engine/values.js';
import { SECTION_ORDER } from './defaults.js';

// The {tokens} a text of the assessment proposal may use, with what each one shows. The form
// lists them for the person; the document fills them in.

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

export const TOKEN_HELP = [
  ['{client}', 'Client company, full name'],
  ['{clientShort}', 'Client, short name'],
  ['{clientLocation}', 'Client location'],
  ['{plantLocation}', 'Where the plant is'],
  ['{provider}', 'EngenX'],
  ['{fee}', 'Fee, e.g. ₹75,000'],
  ['{duration}', 'e.g. 8 working days'],
  ['{siteDays}', 'Days on site'],
  ['{assets}', 'Number of assets'],
  ['{criticalAssets}', 'Assets checked physically'],
  ['{deliverables}', 'Number of deliverables (4)'],
  ['{deliverablesWord}', 'The same in words (four)'],
  ['{date}', 'Proposal date'],
  ['{ref}', 'Document reference'],
  ['{sec.needs}', 'Number of a section, e.g. {sec.deliverables}, {sec.fee}'],
];

/** The numbers of the shown sections, in order: { glance: 1, why: 2, … }. */
export function sectionNumbers(data) {
  let number = 0;
  return Object.fromEntries(
    SECTION_ORDER.filter((key) => data.sections?.[key]?.enabled !== false).map((key) => {
      number += 1;
      return [key, number];
    }),
  );
}

/** Every token with its value. */
export function proposalVars(data) {
  const deliverables = (data.sections?.deliverables?.items ?? []).length;
  const numbers = sectionNumbers(data);
  return {
    client: data.client?.name ?? '',
    clientShort: data.client?.shortName || data.client?.name || '',
    clientLocation: data.client?.location ?? '',
    plantLocation: data.client?.plantLocation ?? '',
    provider: data.provider?.name ?? '',
    providerLocation: data.provider?.location ?? '',
    fee: formatRupees(data.fee?.amount),
    duration: data.facts?.duration ?? '',
    siteDays: data.facts?.siteDays ?? '',
    assets: data.facts?.assetCount ?? '',
    criticalAssets: data.facts?.criticalAssets ?? '',
    deliverables: String(deliverables),
    deliverablesWord: WORDS[deliverables] ?? String(deliverables),
    date: formatLongDate(data.meta?.date),
    ref: data.meta?.docRef ?? '',
    ...Object.fromEntries(
      Object.entries(numbers).map(([key, value]) => [`sec.${key}`, String(value)]),
    ),
  };
}
