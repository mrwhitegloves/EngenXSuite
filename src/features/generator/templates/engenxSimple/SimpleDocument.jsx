import { cleanMailHtml } from '../../../../lib/richText.js';
import {
  AcceptanceBody,
  ClosingFooter,
  Cover,
  SectionHeading,
  Sheet,
} from '../shared/proposalParts.jsx';
import { simpleVars } from './vars.js';

// The simple EngenX proposal (founder, 2026-11-13) as A4 paper: the dark cover page, then the
// pasted content exactly in its layout (headings, bold, lists, tables …), then the numbered
// Acceptance with the seal and signatures and the closing footer. The content is cleaned
// (lib/richText.js: only layout tags, no scripts, no styles) before it is shown or printed.

// The look of the pasted content on paper (headings, lists, tables, quotes, lines, code).
const contentClass = [
  'text-[10pt] leading-relaxed break-words',
  '[&_h1]:mb-[4mm] [&_h1]:mt-[7mm] [&_h1]:border-b-2 [&_h1]:border-doc-ink [&_h1]:pb-[2mm]',
  '[&_h1]:text-[15pt] [&_h1]:font-bold [&_h1]:tracking-tight [&_h1:first-child]:mt-0',
  '[&_h2]:mb-[3mm] [&_h2]:mt-[6mm] [&_h2]:text-[13pt] [&_h2]:font-bold [&_h2]:tracking-tight',
  '[&_h2:first-child]:mt-0 [&_h3]:mb-[2mm] [&_h3]:mt-[5mm] [&_h3]:text-[11pt] [&_h3]:font-bold',
  '[&_h4]:mb-[2mm] [&_h4]:mt-[4mm] [&_h4]:font-bold [&_h5]:font-bold [&_h6]:font-bold',
  '[&_h1]:[break-after:avoid] [&_h2]:[break-after:avoid] [&_h3]:[break-after:avoid]',
  '[&_h4]:[break-after:avoid]',
  '[&_p]:mb-[3mm] [&_div]:mb-[1mm] [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic',
  '[&_i]:italic [&_u]:underline [&_s]:line-through [&_a]:text-doc-accent [&_a]:underline',
  '[&_ul]:mb-[3mm] [&_ul]:list-disc [&_ul]:pl-[6mm] [&_ol]:mb-[3mm] [&_ol]:list-decimal',
  '[&_ol]:pl-[6mm] [&_li]:mb-[1.2mm] [&_li]:pl-[1mm] [&_li]:marker:text-doc-accent',
  '[&_li_ul]:mt-[1mm] [&_li_ol]:mt-[1mm] [&_li_p]:mb-[1mm]',
  '[&_table]:mb-[4mm] [&_table]:w-full [&_table]:border-collapse [&_table]:text-[9pt]',
  '[&_th]:bg-doc-ink [&_th]:px-[2.5mm] [&_th]:py-[1.8mm] [&_th]:text-left [&_th]:font-semibold',
  '[&_th]:text-doc-on-dark [&_td]:border-b [&_td]:border-doc-line [&_td]:px-[2.5mm]',
  '[&_td]:py-[2mm] [&_td]:align-top [&_tr]:[break-inside:avoid] [&_tbody_tr:nth-child(even)]:bg-doc-soft',
  '[&_blockquote]:mb-[4mm] [&_blockquote]:border-l-[1.2mm] [&_blockquote]:border-doc-accent',
  '[&_blockquote]:bg-doc-accent-soft [&_blockquote]:px-[4mm] [&_blockquote]:py-[3mm]',
  '[&_hr]:my-[5mm] [&_hr]:border-doc-line [&_pre]:mb-[3mm] [&_pre]:whitespace-pre-wrap',
  '[&_pre]:bg-doc-soft [&_pre]:p-[3mm] [&_code]:font-mono [&_code]:text-[8.5pt]',
].join(' ');

/**
 * @param {{ data: object, assets: { seal?: string|null } }} props
 */
export default function SimpleDocument({ data, assets = {} }) {
  const vars = simpleVars(data);
  const html = cleanMailHtml(data.content?.html ?? '');
  const acceptance = data.acceptance ?? {};
  return (
    <div data-doc-root className="font-sans text-doc-ink">
      <Cover
        data={data}
        vars={vars}
        facts={[
          ['Prepared for', data.client?.name, data.client?.location],
          ['Prepared by', data.provider?.name, data.provider?.location],
          ['Document ref.', data.meta?.docRef, vars.date],
          ['Duration', data.facts?.duration],
          ['Deliverables', vars.deliverables],
          ['Fee', `${vars.fee} ${data.fee?.gstText ?? ''}`.trim()],
        ]}
      />
      <Sheet data={data} vars={vars} pageNumber={2}>
        {html ? (
          // Cleaned above: layout tags only, no scripts or styles.
          <div className={contentClass} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="mb-[6mm]">
            <mark className="rounded-sm bg-doc-placeholder px-1 text-doc-ink">
              Paste the proposal content in the form (Proposal content).
            </mark>
          </p>
        )}
        <article className="mb-[7mm] mt-[7mm] [break-inside:avoid]">
          <SectionHeading
            number={acceptance.number || ''}
            title={acceptance.title || 'Acceptance'}
            vars={vars}
          />
          <AcceptanceBody section={acceptance} vars={vars} assets={assets} />
        </article>
        <ClosingFooter data={data} vars={vars} />
      </Sheet>
    </div>
  );
}
