import { cloneData, fillText } from '../../engine/values.js';
import { proposalFileName, proposalPageCss, todayInIndia } from '../shared/proposalPage.js';
import { SIMPLE_DEFAULTS } from './defaults.js';
import { SIMPLE_FORM } from './form.js';
import SimpleDocument from './SimpleDocument.jsx';
import { SIMPLE_TOKENS, simpleVars } from './vars.js';

// The simple EngenX proposal (founder, 2026-11-13; replaces the long assessment template for new
// proposals): the same cover page, the proposal pasted with its layout, then the same Acceptance,
// signatures and footer. The template contract is described in ../engenxAssessment/index.js.

export default {
  key: 'engenx-simple',
  kind: 'proposal',
  name: 'EngenX proposal',
  description:
    'Cover page, the proposal pasted from ChatGPT with its layout, acceptance with seal and signatures.',
  createData: () => {
    const data = cloneData(SIMPLE_DEFAULTS);
    data.meta.date = todayInIndia();
    return data;
  },
  defaults: SIMPLE_DEFAULTS,
  form: SIMPLE_FORM,
  tokens: SIMPLE_TOKENS,
  summary(data) {
    const vars = simpleVars(data);
    const title = fillText(data.cover?.title, vars).trim() || 'Proposal';
    const refNo = data.meta?.docRef?.trim() ?? '';
    const clientName = vars.client.trim();
    return {
      title,
      refNo,
      clientName,
      fileName: proposalFileName([refNo, title, clientName]),
    };
  },
  Document: SimpleDocument,
  // The preview shows the PDF's pages (Document `paged`); the number gets the next free one.
  pagedPreview: true,
  autoRef: { path: 'meta.docRef' },
  pageCss(data) {
    const vars = simpleVars(data);
    return proposalPageCss({
      runningTitle: fillText(data.meta?.runningTitle, vars),
      client: vars.client,
      reference: vars.ref,
    });
  },
};
