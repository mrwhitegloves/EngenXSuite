import { formatLongDate } from '../../engine/values.js';

// The {tokens} the simple proposal's texts may use (cover, acceptance, footer).

export const SIMPLE_TOKENS = [
  ['{client}', 'Client company, full name'],
  ['{clientShort}', 'Client, short name'],
  ['{clientLocation}', 'Client location'],
  ['{plantLocation}', 'Where the plant is'],
  ['{provider}', 'EngenX'],
  ['{duration}', 'e.g. 8 working days'],
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
    duration: data.facts?.duration ?? '',
    date: formatLongDate(data.meta?.date),
    ref: data.meta?.docRef ?? '',
  };
}
