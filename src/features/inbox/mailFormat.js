// Small helpers shared by the mail screens (the Inbox and the Mail tab of a company).

export const CATEGORY_LABELS = {
  enquiry: 'Enquiry',
  quotation_request: 'Asks for a quote',
  follow_up: 'Follow-up',
  meeting_request: 'Meeting',
  complaint: 'Complaint',
  information: 'Information',
  other: 'Other',
};

// How the customer sounds in their newest mail (only the two that matter are shown).
export const MOOD_LABELS = { positive: 'Sounds pleased', negative: 'Sounds unhappy' };

export const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';

export const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

export const whoOf = (thread) => thread.contact?.name ?? thread.participants[0] ?? 'Unknown';

export const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** "a@b.in, c@d.in" → ["a@b.in", "c@d.in"]. */
export const addressesOf = (text) =>
  text
    .split(/[,;\s]+/)
    .map((address) => address.trim())
    .filter(Boolean);

/**
 * An answer usually carries the earlier mails below it ("On … wrote:" and lines with ">").
 * Split that part off, so a message shows only what is new in it.
 */
export function splitQuoted(text) {
  const at = text.search(/^(On .+ wrote:|-{2,} ?Original Message ?-{2,}|>)/m);
  return at > 0
    ? { main: text.slice(0, at).trimEnd(), quoted: text.slice(at) }
    : { main: text, quoted: '' };
}
