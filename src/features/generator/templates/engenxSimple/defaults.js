// The starting values of the simple EngenX proposal (founder, 2026-11-13): the same cover page
// and the same acceptance, signatures and footer as before; everything between them is one
// piece of laid-out content, usually written in ChatGPT and pasted with its layout.
// Text may use {tokens} (vars.js), e.g. {client}, {date}; they fill in automatically.

export const SIMPLE_DEFAULTS = {
  meta: {
    // Filled with the next free number (ENGENX-DMA-2026-101 …) when a new proposal opens.
    docRef: '',
    date: '',
    runningTitle: 'Industrial Digital Maturity Assessment',
  },
  client: {
    // The company in Accounts it was filled from ('' = typed by hand).
    accountId: '',
    name: '',
    shortName: '',
    location: '',
    plantLocation: '',
  },
  provider: {
    name: 'EngenX',
    location: 'Jamshedpur, Jharkhand, India',
    contactLine: 'EngenX · Jamshedpur, Jharkhand, India · www.engenx.in · contact@engenx.in',
  },
  facts: {
    duration: '8 working days',
  },
  cover: {
    eyebrow: 'INDUSTRIAL AI & DIGITAL TRANSFORMATION',
    kicker: 'PROPOSAL · ASSESSMENT & TECHNICAL DIAGNOSTIC',
    title: 'Industrial Digital Maturity Assessment',
    summary:
      'Find the cause of motor overheating and unreliable IoT data, check the digital readiness of your assets, and get a clear fix-first roadmap.',
  },
  // The proposal itself, as laid-out HTML (cleaned by lib/richText.js).
  content: { html: '' },
  acceptance: {
    title: 'Acceptance',
    text: 'By signing, {client} confirms the scope, deliverables, fee and terms in this proposal.',
    providerName: 'Kunal Divyanshu',
    providerTitle: 'Founder & CEO, EngenX',
    // The date beside the EngenX signature: today when a proposal is made (index.js), editable.
    date: '',
    showSeal: true,
  },
  footer: {
    confidentiality:
      'Commercial & Confidential. Prepared for {client}. Not to be shared outside the recipient organisation without written consent from {provider}.',
  },
};
