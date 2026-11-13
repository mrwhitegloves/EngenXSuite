import { cssString } from '../../engine/printDocument.js';

// A4 page rules of the proposals for the PDF: the cover page without header and footer; every
// other page with the running title and "Confidential — client" on top, the reference and
// the page number below. Named colours only (margin boxes cannot read the design tokens).

const marginBox = 'font: 7.5pt Inter, sans-serif; color: dimgray;';

// The A4 page margins in mm, and the printed body they leave (the paged preview uses the same).
export const PAGE_MARGIN_MM = { top: 18, right: 16, bottom: 16, left: 16 };
export const PAGE_BODY_MM = {
  width: 210 - PAGE_MARGIN_MM.left - PAGE_MARGIN_MM.right,
  height: 297 - PAGE_MARGIN_MM.top - PAGE_MARGIN_MM.bottom,
};
const { top, right, bottom, left } = PAGE_MARGIN_MM;

/** @param {{ runningTitle: string, client: string, reference: string }} texts */
export function proposalPageCss({ runningTitle, client, reference }) {
  return `
    @page {
      size: A4;
      margin: ${top}mm ${right}mm ${bottom}mm ${left}mm;
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
