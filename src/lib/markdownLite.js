// Markdown (as ChatGPT's "Copy" button gives it) to HTML, for pasting into a document
// (founder, 2026-11-13). Covers what such answers use: headings, bold, italic, inline code,
// links, bulleted and numbered lists (with indented levels), tables, quotes, code blocks and
// horizontal lines. The result is cleaned by lib/richText.js like any pasted HTML.

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
  );

/** Bold, italic, code and links inside one line. */
function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

/** Does this plain text look like Markdown (so it should be laid out, not pasted as lines)? */
export function looksLikeMarkdown(text) {
  return /(^|\n)\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|\|.*\||```|-{3,}\s*$)|\*\*[^*\n]+\*\*/.test(
    String(text ?? ''),
  );
}

/** A list starting at line `start`; nested by indentation. → { html, next } */
function list(lines, start) {
  const baseIndent = lines[start].match(LIST_ITEM)[1].length;
  const ordered = /\d/.test(lines[start].match(LIST_ITEM)[2]);
  const items = [];
  let index = start;
  while (index < lines.length) {
    const match = lines[index].match(LIST_ITEM);
    if (!match || match[1].length < baseIndent) break;
    if (match[1].length > baseIndent && items.length) {
      const nested = list(lines, index);
      items[items.length - 1] += nested.html;
      index = nested.next;
      continue;
    }
    items.push(inline(match[3]));
    index += 1;
  }
  const tag = ordered ? 'ol' : 'ul';
  return {
    html: `<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`,
    next: index,
  };
}

/** Markdown text → HTML. */
export function markdownToHtml(markdown) {
  const lines = String(markdown ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^\s*```/.test(line)) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      index += 1;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      out.push(`<h${level}>${inline(heading[2].replace(/\s*#+\s*$/, ''))}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      out.push('<hr>');
      index += 1;
      continue;
    }
    if (TABLE_ROW.test(line) && TABLE_RULE.test(lines[index + 1] ?? '')) {
      const head = cells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && TABLE_ROW.test(lines[index])) rows.push(cells(lines[index++]));
      out.push(
        `<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      );
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const result = list(lines, index);
      out.push(result.html);
      index = result.next;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index]))
        quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`);
      continue;
    }
    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !LIST_ITEM.test(lines[index]) &&
      !/^\s*(#{1,6}\s|```|>)/.test(lines[index]) &&
      !(TABLE_ROW.test(lines[index]) && TABLE_RULE.test(lines[index + 1] ?? ''))
    ) {
      paragraph.push(inline(lines[index++]));
    }
    out.push(`<p>${paragraph.join('<br>')}</p>`);
  }
  return out.join('');
}
