import { cssString } from '../../engine/printDocument.js';
import { cloneData, fillText } from '../../engine/values.js';
import AssessmentDocument from './AssessmentDocument.jsx';
import { ASSESSMENT_DEFAULTS } from './defaults.js';
import { ASSESSMENT_FORM } from './form.js';
import { TOKEN_HELP, proposalVars } from './vars.js';

// The EngenX assessment proposal (from EngenX_DMA_Proposal.docx, founder 2026-11-12).
// A template is plain data and functions; engine/ and the generator pages need nothing else:
//   key, kind, name, description  how it is listed
//   createData()                  the starting values of a new document
//   form                          the fields of the form (engine/FieldEditor.jsx)
//   tokens                        the {tokens} the person may write, for the help box
//   summary(data)                 title, reference, client and PDF file name for the list
//   Document                      the A4 document, drawn from the values
//   pageCss(data)                 A4 page rules for the PDF (running header, footer, page numbers)

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const marginBox = 'font: 7.5pt Inter, sans-serif; color: dimgray;';

function pageCss(data) {
  const vars = proposalVars(data);
  return `
    @page {
      size: A4;
      margin: 18mm 16mm 16mm 16mm;
      @top-left { content: ${cssString(fillText(data.meta?.runningTitle, vars))}; ${marginBox} vertical-align: bottom; padding-bottom: 3mm; }
      @top-right { content: ${cssString(`Confidential — ${vars.client}`)}; ${marginBox} vertical-align: bottom; padding-bottom: 3mm; }
      @bottom-left { content: ${cssString(vars.ref)}; ${marginBox} vertical-align: top; padding-top: 3mm; }
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

export default {
  key: 'engenx-assessment',
  kind: 'proposal',
  name: 'EngenX assessment proposal',
  description:
    'Cover page, at a glance, problems, deliverables, stages, method, client needs, fee and payment, scope, acceptance with seal.',
  createData: () => {
    const data = cloneData(ASSESSMENT_DEFAULTS);
    data.meta.date = today();
    return data;
  },
  defaults: ASSESSMENT_DEFAULTS,
  form: ASSESSMENT_FORM,
  tokens: TOKEN_HELP,
  summary(data) {
    const vars = proposalVars(data);
    const title = fillText(data.cover?.title, vars).trim() || 'Proposal';
    const refNo = data.meta?.docRef?.trim() ?? '';
    const clientName = vars.client.trim();
    const fileName = [refNo, title, clientName]
      .filter(Boolean)
      .join(' - ')
      .replace(/[\\/:*?"<>|]+/g, ' ');
    return { title, refNo, clientName, fileName };
  },
  Document: AssessmentDocument,
  pageCss,
};
