import Logo from '../../../../components/shared/Logo.jsx';
import Filled from '../../engine/Filled.jsx';
import PagedFlow from '../../engine/PagedFlow.jsx';
import { PAGE_BODY_MM, PAGE_MARGIN_MM } from './proposalPage.js';

// Parts shared by the proposal templates (founder, 2026-11-12 / 2026-11-13): the A4 sheet, the
// dark cover page, numbered section headings, the acceptance with seal and signatures, and the
// closing footer. On screen every sheet is drawn as a page; printed (engine/printDocument.js)
// the sheets are split into A4 pages with the running header, footer and page numbers of the
// template's pageCss().

export const sheetClass =
  'mx-auto mb-6 w-[210mm] bg-doc-paper text-doc-ink shadow-md ' +
  'print:mb-0 print:w-auto print:shadow-none';

/** A section heading; without a `number` only the title. */
export function SectionHeading({ number = '', title, vars }) {
  return (
    <h2 className="mb-[4mm] mt-[2mm] flex items-baseline [break-after:avoid] gap-[3mm] border-b-2 border-doc-ink pb-[2mm] text-[15pt] font-bold tracking-tight">
      {number !== '' && <span className="text-doc-accent">{String(number).padStart(2, '0')}</span>}
      <Filled text={title} vars={vars} />
    </h2>
  );
}

function SignLines({ labels }) {
  return (
    <div className="mt-[3mm] space-y-[4mm] text-[8.5pt] text-doc-muted">
      {labels.map((label) => (
        <p key={label} className="border-b border-doc-line pb-[1mm]">
          {label}
        </p>
      ))}
    </div>
  );
}

/** The acceptance text, the EngenX seal and signature, and the client's lines to sign. */
export function AcceptanceBody({ section, vars, assets }) {
  return (
    <>
      {section.text && (
        <p className="mb-[3mm] leading-relaxed">
          <Filled text={section.text} vars={vars} />
        </p>
      )}
      <div className="mt-[6mm] grid grid-cols-2 gap-[8mm] [break-inside:avoid]">
        <div>
          <p className="mb-[2mm] text-[8pt] font-bold uppercase tracking-[0.15em] text-doc-accent">
            For <Filled text="{provider}" vars={vars} />
          </p>
          <div className="relative h-[34mm]">
            {section.showSeal &&
              (assets.seal ? (
                <img
                  src={assets.seal}
                  alt="Company seal and signature"
                  className="absolute left-0 top-0 h-[34mm] w-auto"
                />
              ) : (
                <span className="absolute left-0 top-0 flex h-[30mm] w-[30mm] items-center justify-center rounded-full border border-dashed border-doc-line text-[8pt] text-doc-muted">
                  Seal
                </span>
              ))}
          </div>
          <p className="font-semibold">
            <Filled text={section.providerName} vars={vars} />
          </p>
          <p className="text-[9pt] text-doc-muted">
            <Filled text={section.providerTitle} vars={vars} />
          </p>
          <SignLines labels={['Signature', 'Date']} />
        </div>
        <div>
          <p className="mb-[2mm] text-[8pt] font-bold uppercase tracking-[0.15em] text-doc-accent">
            For <Filled text="{client}" vars={vars} />
          </p>
          <div className="h-[34mm]" />
          <SignLines labels={['Name', 'Designation', 'Signature', 'Date']} />
        </div>
      </div>
    </>
  );
}

/**
 * The dark cover page. `facts`: [label, value, detail?] shown in the lower half (prepared for,
 * prepared by, reference, duration, deliverables, fee).
 */
export function Cover({ data, vars, facts }) {
  return (
    <section
      className={`${sheetClass} doc-cover flex h-[297mm] flex-col overflow-hidden print:h-[297mm]`}
    >
      <div className="flex flex-[1.15] flex-col bg-doc-ink px-[18mm] pb-[14mm] pt-[18mm] text-doc-on-dark">
        <Logo
          productName={data.provider?.name || 'Logo'}
          background="dark"
          className="h-[9mm] self-start"
        />
        <div className="mt-auto">
          <p className="text-[8.5pt] font-bold tracking-[0.25em] text-doc-accent">
            <Filled text={data.cover?.eyebrow} vars={vars} />
          </p>
          <p className="mt-[2mm] text-[8.5pt] tracking-[0.2em] text-doc-line">
            <Filled text={data.cover?.kicker} vars={vars} />
          </p>
          <h1 className="mt-[6mm] text-[30pt] font-bold leading-[1.08] tracking-tight">
            <Filled text={data.cover?.title} vars={vars} />
          </h1>
          <div className="mt-[6mm] h-[1.2mm] w-[22mm] bg-doc-accent" />
          <p className="mt-[6mm] max-w-[150mm] text-[12pt] leading-relaxed text-doc-line">
            <Filled text={data.cover?.summary} vars={vars} />
          </p>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 content-center gap-x-[10mm] gap-y-[7mm] px-[18mm] py-[12mm]">
        {facts.map(([label, value, detail]) => (
          <div key={label} className="border-l-[1mm] border-doc-accent pl-[4mm]">
            <p className="text-[7.5pt] font-bold uppercase tracking-[0.2em] text-doc-muted">
              {label}
            </p>
            <p className="mt-[1mm] text-[12pt] font-bold">
              {value ? (
                <Filled text={String(value)} vars={vars} />
              ) : (
                <mark className="bg-doc-placeholder">—</mark>
              )}
            </p>
            {detail && <p className="text-[9pt] text-doc-muted">{detail}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/** One content sheet; on screen it shows the running header and footer the PDF will have. */
export function Sheet({ data, vars, pageNumber, children }) {
  return (
    <section
      className={`${sheetClass} flex min-h-[297mm] flex-col px-[16mm] pb-[10mm] pt-[12mm] text-[10pt] print:block print:min-h-0 print:p-0 print:[break-before:page]`}
    >
      <header className="mb-[8mm] flex justify-between border-b border-doc-line pb-[2mm] text-[7.5pt] text-doc-muted print:hidden">
        <span>
          <Filled text={data.meta?.runningTitle} vars={vars} />
        </span>
        <span>
          Confidential — <Filled text="{client}" vars={vars} />
        </span>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-[6mm] flex justify-between border-t border-doc-line pt-[2mm] text-[7.5pt] text-doc-muted print:hidden">
        <span>{data.meta?.docRef}</span>
        <span>Page {pageNumber}</span>
      </footer>
    </section>
  );
}

/** The last lines of the document: contact line and confidentiality note. */
export function ClosingFooter({ data, vars }) {
  return (
    <div className="mt-[10mm] border-t border-doc-line pt-[3mm] text-center text-[8pt] text-doc-muted [break-inside:avoid]">
      <p className="font-semibold text-doc-ink">
        <Filled text={data.provider?.contactLine} vars={vars} />
      </p>
      <p className="mt-[1mm]">
        <Filled text={data.footer?.confidentiality} vars={vars} />
      </p>
    </div>
  );
}

/**
 * The content sheets as the pages of the PDF (preview only): every page with the running
 * header and footer in its margins, as printed. Page numbers start at `firstPage` (the cover is
 * page 1). `onPageCount` hears how many content pages there are.
 */
export function PagedSheets({ data, vars, firstPage = 2, onPageCount, children }) {
  const margin = PAGE_MARGIN_MM;
  return (
    <PagedFlow
      widthMm={PAGE_BODY_MM.width}
      heightMm={PAGE_BODY_MM.height}
      onPageCount={onPageCount}
      renderPage={({ index, body }) => (
        <section
          key={index}
          data-preview-page={firstPage + index}
          className={`${sheetClass} relative h-[297mm] text-[10pt]`}
          style={{ paddingTop: `${margin.top}mm`, paddingLeft: `${margin.left}mm` }}
        >
          <header
            className="absolute inset-x-0 top-0 flex items-end justify-between pb-[3mm] text-[7.5pt] text-doc-muted"
            style={{
              height: `${margin.top}mm`,
              paddingLeft: `${margin.left}mm`,
              paddingRight: `${margin.right}mm`,
            }}
          >
            <span>
              <Filled text={data.meta?.runningTitle} vars={vars} />
            </span>
            <span>
              Confidential — <Filled text="{client}" vars={vars} />
            </span>
          </header>
          {body}
          <footer
            className="absolute inset-x-0 bottom-0 flex items-start justify-between pt-[3mm] text-[7.5pt] text-doc-muted"
            style={{
              height: `${margin.bottom}mm`,
              paddingLeft: `${margin.left}mm`,
              paddingRight: `${margin.right}mm`,
            }}
          >
            <span>{data.meta?.docRef}</span>
            <span>Page {firstPage + index}</span>
          </footer>
        </section>
      )}
    >
      {children}
    </PagedFlow>
  );
}
