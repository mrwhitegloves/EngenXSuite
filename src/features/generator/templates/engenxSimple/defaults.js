// The starting values of the simple EngenX proposal (founder, 2026-11-13): the same cover page
// and the same acceptance, signatures and footer as before; everything between them is one
// piece of laid-out content, usually written in ChatGPT and pasted with its layout.
// Text may use {tokens} (vars.js), e.g. {client}, {fee}; they fill in automatically.

export const SIMPLE_DEFAULTS = {
  meta: {
    docRef: 'ENGENX-XXX-2026-001',
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
    deliverables: '4',
  },
  fee: { amount: 75000, gstText: '+ GST' },
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
    number: '10',
    title: 'Acceptance',
    text: 'By signing, {client} confirms the scope, deliverables, fee and terms in this proposal.',
    providerName: 'Kunal Divyanshu',
    providerTitle: 'Founder & CEO, EngenX',
    showSeal: true,
  },
  footer: {
    confidentiality:
      'Commercial & Confidential. Prepared for {client}. Not to be shared outside the recipient organisation without written consent from {provider}.',
  },
};
