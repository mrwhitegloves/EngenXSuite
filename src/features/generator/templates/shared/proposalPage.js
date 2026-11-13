import { cssString } from '../../engine/printDocument.js';

// A4 page rules of the proposals for the PDF: the cover page without header and footer; every
// other page with the running title and "Confidential — client" on top, the reference and
// the page number below. Named colours only (margin boxes cannot read the design tokens).

const marginBox = 'font: 7.5pt Inter, sans-serif; color: dimgray;';

/** @param {{ runningTitle: string, client: string, reference: string }} texts */
export function proposalPageCss({ runningTitle, client, reference }) {
  return `
    @page {
      size: A4;
      margin: 18mm 16mm 16mm 16mm;
      @top-left { content: ${cssString(runningTitle)}; ${marginBox} vertical-align: bottom; padding-bottom: 3mm; }
      @top-right { content: ${cssString(`Confidential — ${client}`)}; ${marginBox} vertical-align: bottom; padding-bottom: 3mm; }
      @bottom-left { content: ${cssString(reference)}; ${marginBox} vertical-align: top; padding-top: 3mm; }
      @bottom-right { content: "Page " counter(page); ${marginBox} vertical-align: top; padding-top: 3mm; }
    }
    @page cover {
      margin: 0;
      @top-left { content: none; }
      @top-right { content: none; }
      @bottom-left { content: none; }
      @bottom-right { content: none; }
    }
    .doc-cover { page: cover; }
  `;
}

export const todayInIndia = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** A PDF file name from the reference, title and client. */
export const proposalFileName = (parts) =>
  parts
    .filter(Boolean)
    .join(' - ')
    .replace(/[\\/:*?"<>|]+/g, ' ');
