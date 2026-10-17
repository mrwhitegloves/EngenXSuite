import DOMPurify from 'dompurify';

// The laid-out (HTML) form of a mail written in the CRM. What is pasted keeps its structure
// (bold, italic, underline, headings, lists, links, tables) but not its colours and fonts, so it
// reads the same in light and dark mode and in every mail program. The server cleans it once
// more before the mail goes out (server/lib/mailHtml.js).

const ALLOWED_TAGS = [
  'p',
  'br',
  'div',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'hr',
  'a',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
];
const ALLOWED_ATTR = ['href', 'colspan', 'rowspan'];

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Plain text (the AI's draft, a signature) as HTML: paragraphs and line breaks kept. */
export function textToHtml(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .filter((part) => part.trim())
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Some programs (Google Docs, Word) mark bold, italic and underline with a style on a <span>
 * instead of a tag. Those styles are turned into tags before styles are dropped.
 */
function keepStyleMeaning(root) {
  for (const element of [...root.querySelectorAll('[style]')]) {
    const style = element.style;
    const weight = style.fontWeight;
    const wraps = [];
    if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) wraps.push('b');
    if (style.fontStyle === 'italic') wraps.push('i');
    if (/underline/.test(style.textDecoration || style.textDecorationLine || '')) wraps.push('u');
    for (const tag of wraps) {
      const wrapper = root.ownerDocument.createElement(tag);
      while (element.firstChild) wrapper.appendChild(element.firstChild);
      element.appendChild(wrapper);
    }
  }
}

/** Pasted or typed HTML, made safe and plain in look. */
export function cleanMailHtml(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  keepStyleMeaning(doc.body);
  return DOMPurify.sanitize(doc.body.innerHTML, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i,
  });
}

/** The HTML that goes out: the content in a simple, readable frame. */
export function mailHtmlForSending(html) {
  const clean = cleanMailHtml(html);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">${clean}</div>`;
}
