import { apiDownload } from '../../../lib/apiClient.js';

// "Download PDF" of the Document generator. The live preview IS the document: its HTML, the
// app's styles and the template's page rules (A4, margins, running header and footer, page
// numbers) become one self-contained page (pictures inside it as data addresses).
// - downloadPdf(): the server turns that page into a PDF file with Chromium (one click; the
//   server refuses any outside address, which is why everything is inside the page);
// - printDocument(): the same page in the browser's print dialog ("Save as PDF"), used when the
//   server cannot make PDFs.

/** A string for CSS `content: "…"` (quotes and backslashes escaped, one line). */
export const cssString = (text) =>
  `"${String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ')}"`;

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
  );

/** Every style rule of the app as text (sheets of another site cannot be read and are skipped). */
function appCss() {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
}

async function toDataUrl(src) {
  const response = await fetch(src, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Picture not found: ${src}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * The document as one self-contained HTML page.
 * @param {{ element: HTMLElement, fileName: string, pageCss: string }} options
 */
export async function buildDocumentHtml({ element, fileName, pageCss }) {
  const copy = element.cloneNode(true);
  copy.setAttribute('data-printing', 'true');
  await Promise.all(
    [...copy.querySelectorAll('img')].map(async (image) => {
      const src = image.getAttribute('src');
      if (src && !src.startsWith('data:')) image.setAttribute('src', await toDataUrl(src));
    }),
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(fileName)}</title>
<style>${appCss()}</style>
<style>
  html, body { margin: 0; padding: 0; background: var(--doc-paper); }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ${pageCss}
</style>
</head>
<body>${copy.outerHTML}</body>
</html>`;
}

/** The browser's print dialog for the document ("Save as PDF"). */
export async function printDocument({ element, fileName, pageCss }) {
  const html = await buildDocumentHtml({ element, fileName, pageCss });
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  await doc.fonts?.ready;

  const appTitle = document.title;
  document.title = fileName; // some browsers name the PDF after the main page
  let cleaned = false;
  const cleanUp = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = appTitle;
    setTimeout(() => frame.remove(), 1000);
  };
  frame.contentWindow.addEventListener('afterprint', cleanUp, { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
  // Browsers without "afterprint" on frames: clean up after the dialog returns.
  setTimeout(cleanUp, 60000);
}

/**
 * One click: the PDF file is made on the server and saved by the browser. When the server
 * cannot make PDFs, the print dialog opens instead.
 * @returns {Promise<'downloaded' | 'printed'>}
 */
export async function downloadPdf({ element, fileName, pageCss }) {
  const html = await buildDocumentHtml({ element, fileName, pageCss });
  try {
    await apiDownload('/generator/pdf', `${fileName}.pdf`, {
      method: 'POST',
      body: { html, fileName },
    });
    return 'downloaded';
  } catch (error) {
    if (error.code !== 'PDF_UNAVAILABLE') throw error;
    await printDocument({ element, fileName, pageCss });
    return 'printed';
  }
}
