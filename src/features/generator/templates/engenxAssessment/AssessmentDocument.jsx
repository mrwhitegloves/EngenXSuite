import { ArrowRight, Check, X } from 'lucide-react';
import Logo from '../../../../components/shared/Logo.jsx';
import Filled from '../../engine/Filled.jsx';
import { formatRupees } from '../../engine/values.js';
import { SECTION_ORDER } from './defaults.js';
import { proposalVars, sectionNumbers } from './vars.js';

// The EngenX assessment proposal as A4 paper: a dark cover page, then the numbered sections.
// On screen every "sheet" is drawn as a page; when printed (engine/printDocument.js) the browser
// splits the sheets into A4 pages with the running header, footer and page numbers of
// pageCss(). A section marked "Start on a new page" begins a new sheet.

const sheetClass =
  'mx-auto mb-6 w-[210mm] bg-doc-paper text-doc-ink shadow-md ' +
  'print:mb-0 print:w-auto print:shadow-none';

function Text({ value, vars, className = '' }) {
  if (!value) return null;
  return (
    <p className={`mb-[3mm] leading-relaxed ${className}`}>
      <Filled text={value} vars={vars} />
    </p>
  );
}

function SectionHeading({ number, title, vars }) {
  return (
    <h2 className="mb-[4mm] mt-[2mm] flex items-baseline [break-after:avoid] gap-[3mm] border-b-2 border-doc-ink pb-[2mm] text-[15pt] font-bold tracking-tight">
      <span className="text-doc-accent">{String(number).padStart(2, '0')}</span>
      <Filled text={title} vars={vars} />
    </h2>
  );
}

function SubHeading({ value, vars }) {
  if (!value) return null;
  return (
    <h3 className="mb-[2mm] mt-[5mm] text-[10.5pt] [break-after:avoid] font-bold uppercase tracking-wide text-doc-ink">
      <Filled text={value} vars={vars} />
    </h3>
  );
}

function Table({ head, rows, widths }) {
  return (
    <table className="mb-[4mm] w-full border-collapse text-[9pt] [break-inside:auto]">
      <thead>
        <tr className="bg-doc-ink text-left text-doc-on-dark">
          {head.map((cell, index) => (
            <th
              key={index}
              className="px-[2.5mm] py-[1.8mm] font-semibold"
              style={{ width: widths?.[index] }}
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-b border-doc-line align-top even:bg-doc-soft [break-inside:avoid]"
          >
            {row.map((cell, index) => (
              <td key={index} className="px-[2.5mm] py-[2mm]">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bullets({ items, vars, marker = 'dot' }) {
  if (!items?.length) return null;
  return (
    <ul className="mb-[3mm] space-y-[1.5mm]">
      {items.map((item, index) => (
        <li key={index} className="flex gap-[2.5mm] leading-relaxed [break-inside:avoid]">
          {marker === 'number' ? (
            <span className="w-[5mm] shrink-0 font-bold text-doc-accent">{index + 1}.</span>
          ) : marker === 'check' ? (
            <Check className="mt-[0.8mm] size-[3.6mm] shrink-0 text-doc-ok" strokeWidth={3} />
          ) : marker === 'cross' ? (
            <X className="mt-[0.8mm] size-[3.6mm] shrink-0 text-doc-accent" strokeWidth={3} />
          ) : (
            <span className="mt-[1.9mm] size-[1.6mm] shrink-0 rounded-full bg-doc-accent" />
          )}
          <span>
            <Filled text={item} vars={vars} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children, tone = 'soft' }) {
  return (
    <div
      className={`mb-[4mm] border-l-[1.2mm] px-[4mm] py-[3mm] [break-inside:avoid] ${
        tone === 'accent' ? 'border-doc-accent bg-doc-accent-soft' : 'border-doc-ink bg-doc-soft'
      }`}
    >
      {children}
    </div>
  );
}

// ---- The sections ----

const SECTIONS = {
  glance: ({ section, vars }) => (
    <>
      <Callout tone="accent">
        <p className="mb-[1mm] text-[8pt] font-bold uppercase tracking-[0.15em] text-doc-accent">
          <Filled text={section.title} vars={vars} />
        </p>
        <p className="text-[11pt] font-semibold leading-snug">
          <Filled text={section.text} vars={vars} />
        </p>
      </Callout>
      <SubHeading value="At a glance" vars={vars} />
      <dl className="mb-[4mm] divide-y divide-doc-line border-y border-doc-line text-[9.5pt]">
        {(section.rows ?? []).map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[38mm_1fr] gap-[3mm] py-[2mm] [break-inside:avoid]"
          >
            <dt className="font-semibold">
              <Filled text={row.label} vars={vars} />
            </dt>
            <dd>
              <Filled text={row.value} vars={vars} />
            </dd>
          </div>
        ))}
      </dl>
    </>
  ),

  why: ({ section, vars }) => (
    <>
      <Text value={section.intro} vars={vars} />
      <ul className="mb-[4mm] space-y-[2mm]">
        {(section.problems ?? []).map((problem, index) => (
          <li key={index} className="flex gap-[2.5mm] [break-inside:avoid]">
            <span className="mt-[1.9mm] size-[1.6mm] shrink-0 rounded-full bg-doc-accent" />
            <span>
              <strong className="font-semibold">
                <Filled text={problem.title} vars={vars} />
              </strong>{' '}
              <Filled text={problem.text} vars={vars} />
            </span>
          </li>
        ))}
      </ul>
      <Text value={section.lead} vars={vars} />
      <div className="mb-[4mm] grid grid-cols-3 gap-[3mm] [break-inside:avoid]">
        {(section.questions ?? []).map((question, index) => (
          <div
            key={index}
            className="border-t-[1mm] border-doc-accent bg-doc-soft px-[3mm] py-[3mm]"
          >
            <p className="text-[18pt] font-bold leading-none text-doc-accent">{index + 1}</p>
            <p className="mt-[2mm] text-[9.5pt] font-semibold leading-snug">
              <Filled text={question} vars={vars} />
            </p>
          </div>
        ))}
      </div>
    </>
  ),

  deliverables: ({ section, vars }) => (
    <>
      <Text value={section.intro} vars={vars} />
      <Table
        head={['#', 'Deliverable', 'What it tells you', 'Format']}
        widths={['10mm', '40mm', undefined, '32mm']}
        rows={(section.items ?? []).map((item) => [
          <strong key="c" className="text-doc-accent">
            {item.code}
          </strong>,
          <strong key="n">
            <Filled text={item.name} vars={vars} />
          </strong>,
          <Filled key="w" text={item.what} vars={vars} />,
          <Filled key="f" text={item.format} vars={vars} />,
        ])}
      />
      {(section.notes ?? []).map((note, index) => (
        <p key={index} className="mb-[3mm] leading-relaxed">
          <strong className="font-semibold">
            <Filled text={note.title} vars={vars} />
          </strong>{' '}
          <Filled text={note.text} vars={vars} />
        </p>
      ))}
      <Text value={section.areasIntro} vars={vars} />
      <ol className="mb-[4mm] grid grid-cols-3 gap-[2.5mm] [break-inside:avoid]">
        {(section.areas ?? []).map((area, index) => (
          <li
            key={index}
            className="flex items-start gap-[2mm] border border-doc-line px-[2.5mm] py-[2mm] text-[9pt]"
          >
            <span className="flex size-[5mm] shrink-0 items-center justify-center rounded-full bg-doc-ink text-[8pt] font-bold text-doc-on-dark">
              {index + 1}
            </span>
            <Filled text={area} vars={vars} />
          </li>
        ))}
      </ol>
    </>
  ),

  process: ({ section, vars }) => (
    <>
      <Table
        head={['Stage', 'Where', 'Time', 'What happens', 'Output']}
        widths={['30mm', '26mm', '24mm', undefined, '26mm']}
        rows={(section.stages ?? []).map((stage) => [
          <strong key="s">
            <Filled text={stage.stage} vars={vars} />
          </strong>,
          <Filled key="w" text={stage.where} vars={vars} />,
          <Filled key="t" text={stage.time} vars={vars} />,
          <Filled key="h" text={stage.what} vars={vars} />,
          <Filled key="o" text={stage.output} vars={vars} />,
        ])}
      />
      <Callout>
        <Filled text={section.note} vars={vars} />
      </Callout>
    </>
  ),

  method: ({ section, vars }) => (
    <>
      <Text value={section.intro} vars={vars} />
      <SubHeading value={section.checklistTitle} vars={vars} />
      <Bullets items={section.checklist} vars={vars} marker="number" />
      {section.checklistNote && (
        <Callout tone="accent">
          <Filled text={section.checklistNote} vars={vars} />
        </Callout>
      )}
      <SubHeading value={section.chainTitle} vars={vars} />
      <div className="mb-[3mm] flex flex-wrap items-center gap-[1.5mm] [break-inside:avoid]">
        {(section.chain ?? []).map((link, index) => (
          <span key={index} className="flex items-center gap-[1.5mm]">
            {index > 0 && <ArrowRight className="size-[3.5mm] text-doc-accent" />}
            <span className="bg-doc-ink px-[3mm] py-[1.5mm] text-[8.5pt] font-semibold text-doc-on-dark">
              <Filled text={link} vars={vars} />
            </span>
          </span>
        ))}
      </div>
      <Text value={section.chainNote} vars={vars} />
      {section.evidence && (
        <Callout>
          <Filled text={section.evidence} vars={vars} />
        </Callout>
      )}
    </>
  ),

  needs: ({ section, vars }) => (
    <>
      <Text value={section.intro} vars={vars} />
      <Bullets items={section.items} vars={vars} marker="check" />
      {section.note && (
        <Callout>
          <Filled text={section.note} vars={vars} />
        </Callout>
      )}
    </>
  ),

  fee: ({ section, vars, data }) => {
    const fee = Number(data.fee?.amount) || 0;
    return (
      <>
        <Table
          head={['Item', 'Amount']}
          widths={[undefined, '62mm']}
          rows={(section.items ?? []).map((row) => [
            <Filled key="i" text={row.item} vars={vars} />,
            <strong key="a">
              <Filled text={row.amount} vars={vars} />
            </strong>,
          ])}
        />
        <SubHeading value={section.paymentTitle} vars={vars} />
        <Table
          head={['Share', 'Amount', 'When']}
          widths={['20mm', '40mm', undefined]}
          rows={(section.milestones ?? []).map((row) => [
            <strong key="p" className="text-doc-accent">
              {Number(row.percent) || 0}%
            </strong>,
            <strong key="a">
              {formatRupees(Math.round((fee * (Number(row.percent) || 0)) / 100))}{' '}
              {data.fee?.gstText}
            </strong>,
            <Filled key="w" text={row.when} vars={vars} />,
          ])}
        />
      </>
    );
  },

  scope: ({ section, vars }) => (
    <>
      <div className="mb-[4mm] grid grid-cols-2 gap-[4mm] [break-inside:avoid]">
        <div className="border-t-[1mm] border-doc-ok bg-doc-soft px-[3.5mm] py-[3mm]">
          <p className="mb-[2mm] text-[8pt] font-bold uppercase tracking-[0.15em] text-doc-ok">
            Included
          </p>
          <Bullets items={section.included} vars={vars} marker="check" />
        </div>
        <div className="border-t-[1mm] border-doc-accent bg-doc-soft px-[3.5mm] py-[3mm]">
          <p className="mb-[2mm] text-[8pt] font-bold uppercase tracking-[0.15em] text-doc-accent">
            Not included (proposed separately if needed)
          </p>
          <Bullets items={section.excluded} vars={vars} marker="cross" />
        </div>
      </div>
      <SubHeading value={section.notesTitle} vars={vars} />
      <Bullets items={section.notes} vars={vars} />
    </>
  ),

  after: ({ section, vars }) => <Text value={section.text} vars={vars} />,

  acceptance: ({ section, vars, assets }) => (
    <>
      <Text value={section.text} vars={vars} />
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
  ),
};

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

// ---- Pages ----

function Cover({ data, vars }) {
  const facts = [
    ['Prepared for', data.client?.name, data.client?.location],
    ['Prepared by', data.provider?.name, data.provider?.location],
    ['Document ref.', data.meta?.docRef, vars.date],
    ['Duration', data.facts?.duration],
    ['Deliverables', vars.deliverables],
    ['Fee', `${vars.fee} ${data.fee?.gstText ?? ''}`.trim()],
  ];
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
function Sheet({ data, vars, pageNumber, children }) {
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

/**
 * @param {{ data: object, assets: { seal?: string|null } }} props
 */
export default function AssessmentDocument({ data, assets = {} }) {
  const vars = proposalVars(data);
  const numbers = sectionNumbers(data);
  const shown = SECTION_ORDER.filter((key) => numbers[key]);

  // Sheets: a new one starts at every section marked "Start on a new page".
  const sheets = [];
  for (const key of shown) {
    if (!sheets.length || data.sections[key].newPage) sheets.push([]);
    sheets.at(-1).push(key);
  }
  if (!sheets.length) sheets.push([]);

  return (
    <div data-doc-root className="font-sans text-doc-ink">
      <Cover data={data} vars={vars} />
      {sheets.map((keys, index) => (
        <Sheet key={keys.join('-') || 'empty'} data={data} vars={vars} pageNumber={index + 2}>
          {keys.map((key) => {
            const Body = SECTIONS[key];
            const section = data.sections[key];
            return (
              <article key={key} className="mb-[7mm]">
                <SectionHeading number={numbers[key]} title={section.title} vars={vars} />
                <Body section={section} vars={vars} data={data} assets={assets} />
              </article>
            );
          })}
          {index === sheets.length - 1 && (
            <div className="mt-[10mm] border-t border-doc-line pt-[3mm] text-center text-[8pt] text-doc-muted [break-inside:avoid]">
              <p className="font-semibold text-doc-ink">
                <Filled text={data.provider?.contactLine} vars={vars} />
              </p>
              <p className="mt-[1mm]">
                <Filled text={data.footer?.confidentiality} vars={vars} />
              </p>
            </div>
          )}
        </Sheet>
      ))}
    </div>
  );
}
