import { formatLongDate, formatRupees } from '../../engine/values.js';

// The {tokens} the simple proposal's texts may use (cover, acceptance, footer).

export const SIMPLE_TOKENS = [
  ['{client}', 'Client company, full name'],
  ['{clientShort}', 'Client, short name'],
  ['{clientLocation}', 'Client location'],
  ['{plantLocation}', 'Where the plant is'],
  ['{provider}', 'EngenX'],
  ['{fee}', 'Fee, e.g. ₹75,000'],
  ['{duration}', 'e.g. 8 working days'],
  ['{deliverables}', 'Number of deliverables'],
  ['{date}', 'Proposal date'],
  ['{ref}', 'Document reference'],
];

export function simpleVars(data) {
  return {
    client: data.client?.name ?? '',
    clientShort: data.client?.shortName || data.client?.name || '',
    clientLocation: data.client?.location ?? '',
    plantLocation: data.client?.plantLocation ?? '',
    provider: data.provider?.name ?? '',
    providerLocation: data.provider?.location ?? '',
    fee: formatRupees(data.fee?.amount),
    duration: data.facts?.duration ?? '',
    deliverables: String(data.facts?.deliverables ?? ''),
    date: formatLongDate(data.meta?.date),
    ref: data.meta?.docRef ?? '',
  };
}
