import { Fragment } from 'react';

// Words, times and the WhatsApp text format of the WhatsApp screen, in one place.

const TIME_FORMAT = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "10:42 am" today, "Yesterday", or a date: the time beside a chat in the list. */
export function listTime(value, now = new Date()) {
  if (!value) return '';
  const date = new Date(value);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) return TIME_FORMAT.format(date);
  if (days === 1) return 'Yesterday';
  return date.getFullYear() === now.getFullYear()
    ? DATE_FORMAT.format(date)
    : FULL_DATE_FORMAT.format(date);
}

/** The time under a message. */
export const messageTime = (value) => TIME_FORMAT.format(new Date(value));

/** "Today", "Yesterday" or the date: the line between the messages of two days. */
export function dayLabel(value, now = new Date()) {
  const date = new Date(value);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return FULL_DATE_FORMAT.format(date);
}

export const isSameDay = (a, b) => startOfDay(new Date(a)) - startOfDay(new Date(b)) === 0;

/** "1.2 MB" */
export function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** How long free text may still be sent: "5 h 20 min", or null when the window is closed. */
export function windowLeft(closesAt, now = new Date()) {
  if (!closesAt) return null;
  const minutes = Math.floor((new Date(closesAt) - now) / 60_000);
  if (minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

export const TYPE_LABELS = {
  image: 'Photo',
  video: 'Video',
  audio: 'Voice message',
  document: 'Document',
  sticker: 'Sticker',
  location: 'Location',
  template: 'Template',
};

// The tabs of the list.
export const LIST_VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'needs_reply', label: 'Needs reply' },
  { id: 'window_open', label: 'Can reply (24 h)' },
  { id: 'unknown', label: 'Not in the CRM' },
];

// The files the composer accepts (WhatsApp's own kinds; the server checks the exact limits).
export const ACCEPTED_FILES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/3gpp',
  'audio/aac',
  'audio/amr',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.gif',
  '.webp',
  '.heic',
].join(',');
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

// ── WhatsApp's text format: *bold*, _italic_, ~strike~, ```monospace``` ─────────────────────

const LINK = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

function withLinks(text, keyPrefix) {
  return text.split(LINK).map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={`${keyPrefix}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-info underline"
      >
        {part}
      </a>
    ) : (
      <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>
    ),
  );
}

// One mark at a time, outermost first. A mark must touch its words: "*bold*", not "* bold *".
const MARKS = [
  {
    pattern: /```([\s\S]+?)```/,
    wrap: (inner, key) => (
      <code key={key} className="font-mono">
        {inner}
      </code>
    ),
  },
  { pattern: /\*(\S(?:[^*\n]*\S)?)\*/, wrap: (inner, key) => <strong key={key}>{inner}</strong> },
  {
    pattern: /(?<![\w])_(\S(?:[^_\n]*\S)?)_(?![\w])/,
    wrap: (inner, key) => <em key={key}>{inner}</em>,
  },
  { pattern: /~(\S(?:[^~\n]*\S)?)~/, wrap: (inner, key) => <s key={key}>{inner}</s> },
];

/**
 * A message text as WhatsApp shows it: the marks become bold, italic, strike and monospace,
 * and links can be clicked. Line breaks are kept by the bubble (whitespace-pre-wrap).
 */
export function renderWhatsAppText(text, keyPrefix = 'm') {
  if (!text) return null;
  let first = null;
  for (const mark of MARKS) {
    const found = mark.pattern.exec(text);
    if (found && (!first || found.index < first.found.index)) first = { mark, found };
  }
  if (!first) return withLinks(text, keyPrefix);
  const { mark, found } = first;
  const before = text.slice(0, found.index);
  const after = text.slice(found.index + found[0].length);
  const inner = mark === MARKS[0] ? found[1] : renderWhatsAppText(found[1], `${keyPrefix}i`);
  return [
    ...(before ? [withLinks(before, `${keyPrefix}b`)] : []),
    mark.wrap(inner, `${keyPrefix}w`),
    ...(after ? [renderWhatsAppText(after, `${keyPrefix}a`)] : []),
  ];
}

// ── Pasted content → WhatsApp's text format ─────────────────────────────────────────────────

const BLOCKS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'TR',
  'SECTION',
  'ARTICLE',
]);

function isBold(element) {
  const weight = element.style?.fontWeight;
  return ['B', 'STRONG'].includes(element.tagName) || weight === 'bold' || Number(weight) >= 600;
}
const isItalic = (element) =>
  ['I', 'EM'].includes(element.tagName) || element.style?.fontStyle === 'italic';
const isStrike = (element) =>
  ['S', 'DEL', 'STRIKE'].includes(element.tagName) ||
  /line-through/.test(element.style?.textDecoration ?? '');

// Put a mark around text without swallowing its spaces: "*bold* " not "*bold *".
function wrapWith(text, sign) {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  return match[2] ? `${match[1]}${sign}${match[2]}${sign}${match[3]}` : text;
}

function convert(node, state) {
  if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
  if (node.nodeType !== 1) return '';
  const element = node;
  const tag = element.tagName;
  if (['SCRIPT', 'STYLE', 'HEAD', 'TITLE', 'META'].includes(tag)) return '';
  if (tag === 'BR') return '\n';
  if (tag === 'PRE') return `\n\`\`\`${element.textContent}\`\`\`\n`;
  if (tag === 'UL' || tag === 'OL') {
    const items = [...element.children].filter((child) => child.tagName === 'LI');
    const lines = items.map((item, index) => {
      const text = [...item.childNodes]
        .map((child) => convert(child, state))
        .join('')
        .trim();
      return `${tag === 'OL' ? `${index + 1}.` : '•'} ${text}`;
    });
    return `\n${lines.join('\n')}\n`;
  }
  let inner = [...element.childNodes].map((child) => convert(child, state)).join('');
  if (tag === 'CODE') inner = wrapWith(inner, '```');
  else {
    if (isBold(element) || /^H[1-6]$/.test(tag)) inner = wrapWith(inner, '*');
    if (isItalic(element)) inner = wrapWith(inner, '_');
    if (isStrike(element)) inner = wrapWith(inner, '~');
  }
  if (tag === 'TD' || tag === 'TH') return `${inner.trim()}  `;
  if (BLOCKS.has(tag)) return `\n${inner.trim()}\n`;
  return inner;
}

/**
 * Formatted content (from Word, Google Docs, a web page or a mail) as WhatsApp text: bold →
 * *bold*, italic → _italic_, strike → ~strike~, code → ```code```, lists → "• item" or
 * "1. item", paragraphs → new lines. The composer stays plain text.
 */
export function htmlToWhatsApp(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  const text = convert(doc.body, {});
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}
