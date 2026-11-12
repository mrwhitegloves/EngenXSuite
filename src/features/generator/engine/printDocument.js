// "Download PDF" of the Document generator. The live preview IS the document: its HTML is copied
// into a hidden frame with the app's styles and the template's page rules (A4, margins, running
// header and footer, page numbers), and the browser's print opens with "Save as PDF". So the
// PDF looks exactly like the preview, its text can be selected and searched, and no PDF library
// is needed.

const waitFor = (element, event, ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    element.addEventListener(event, () => {
      clearTimeout(timer);
      resolve();
    });
    element.addEventListener('error', () => {
      clearTimeout(timer);
      resolve();
    });
  });

/** A string for CSS `content: "…"` (quotes and backslashes escaped, one line). */
export const cssString = (text) =>
  `"${String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ')}"`;

/**
 * Prints one document element.
 * @param {{ element: HTMLElement, fileName: string, pageCss: string }} options
 *   element  the document root (unscaled), e.g. the preview's [data-doc-root]
 *   fileName suggested PDF name (the browser uses the page title)
 *   pageCss  @page rules of the template
 */
export async function printDocument({ element, fileName, pageCss }) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>',
  );
  doc.close();
  doc.title = fileName;

  const sheets = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((node) =>
    doc.head.appendChild(node.cloneNode(true)),
  );
  const page = doc.createElement('style');
  page.textContent = `
    html, body { margin: 0; padding: 0; background: var(--doc-paper); }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${pageCss}`;
  doc.head.append(page);
  doc.body.innerHTML = element.outerHTML;
  doc.body.firstElementChild?.setAttribute('data-printing', 'true');

  await Promise.all([
    ...sheets.filter((node) => node.tagName === 'LINK').map((node) => waitFor(node, 'load', 4000)),
    ...[...doc.images]
      .filter((image) => !image.complete)
      .map((image) => waitFor(image, 'load', 4000)),
  ]);
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
