// The starting content of the EngenX assessment proposal, taken from EngenX_DMA_Proposal.docx
// (founder, 2026-11-12). Everything here can be changed in the form. Text may use {tokens}
// (list in vars.js), e.g. {client}, {fee}, {sec.deliverables}; they fill in automatically.

export const ASSESSMENT_DEFAULTS = {
  meta: {
    docRef: 'ENGENX-SPB-DMA-2026-001',
    date: '',
    runningTitle: 'Industrial Digital Maturity Assessment',
  },
  client: {
    // The company in Accounts it was filled from ('' = typed by hand).
    accountId: '',
    name: 'Sripathi Paper and Boards Pvt. Ltd.',
    shortName: 'Sripathi Paper and Boards',
    location: 'Tamil Nadu, India',
    plantLocation: 'Tamil Nadu',
  },
  provider: {
    name: 'EngenX',
    location: 'Jamshedpur, Jharkhand, India',
    contactLine: 'EngenX · Jamshedpur, Jharkhand, India · www.engenx.in · contact@engenx.in',
  },
  facts: {
    duration: '8 working days',
    siteDays: '3',
    assetCount: '~290',
    criticalAssets: '30',
  },
  fee: { amount: 75000, gstText: '+ GST' },
  cover: {
    eyebrow: 'INDUSTRIAL AI & DIGITAL TRANSFORMATION',
    kicker: 'PROPOSAL · ASSESSMENT & TECHNICAL DIAGNOSTIC',
    title: 'Industrial Digital Maturity Assessment',
    summary:
      'Find the cause of motor overheating and unreliable IoT data, check the digital readiness of {assets} assets, and get a clear fix-first roadmap.',
  },
  sections: {
    glance: {
      enabled: true,
      newPage: false,
      title: 'What we will do',
      text: 'Find out why your motors overheat and why your IoT data is unreliable, check the digital readiness of your {assets} assets, and give you a clear fix-first roadmap.',
      rows: [
        {
          label: 'What you receive',
          value: '{deliverables} deliverables (Section {sec.deliverables}).',
        },
        { label: 'Fee', value: '{fee} + applicable GST.' },
        {
          label: 'Where',
          value: '{siteDays} days at your plant in {plantLocation}, the rest at {provider}.',
        },
        {
          label: 'Time',
          value: '{duration} from the date we receive your data pack and site access is confirmed.',
        },
      ],
    },
    why: {
      enabled: true,
      newPage: false,
      title: 'Why this assessment',
      intro: '{client} has told us about two problems and one gap:',
      problems: [
        { title: 'Motors overheat repeatedly.', text: 'The cause is not yet known.' },
        {
          title: 'IoT data has been inconsistent for the last three months.',
          text: 'Maintenance decisions cannot rely on it.',
        },
        {
          title: 'No clear picture across {assets} assets.',
          text: 'It is not clear which assets are monitored, which are critical, and where the gaps are.',
        },
      ],
      lead: 'Before spending on new sensors, software or analytics, the first step is to find the real causes. This assessment does that, in a fixed time and for a fixed fee. We answer three questions:',
      questions: [
        'Why are the motors overheating?',
        'Why is the IoT data unreliable?',
        'Where do we stand, and what should be fixed first?',
      ],
    },
    deliverables: {
      enabled: true,
      newPage: true,
      title: 'What you receive: {deliverablesWord} deliverables',
      intro:
        'These {deliverablesWord} are the complete deliverable list. Anything beyond them is proposed separately.',
      items: [
        {
          code: 'D1',
          name: 'Motor Overheating Report',
          what: 'Likely causes of the overheating, what is confirmed and what is still probable, and corrective actions in priority order.',
          format: 'Report (PDF)',
        },
        {
          code: 'D2',
          name: 'IoT Data Reliability Report',
          what: 'Where in the data chain (sensor to dashboard) data is lost or wrong, the cause of each failure point, and how to fix it. Includes a review of the existing IoT setup.',
          format: 'Report (PDF)',
        },
        {
          code: 'D3',
          name: 'Asset Readiness Register',
          what: 'All {assets} assets listed with monitoring status, sensor and data availability, criticality (High / Medium / Low) and the gap to close.',
          format: 'Excel',
        },
        {
          code: 'D4',
          name: 'Roadmap & Management Presentation',
          what: 'Digital maturity score on 5 areas, a one-page recommended architecture, and a 3-stage roadmap with indicative investment ranges.',
          format: 'Presentation + roadmap summary (PDF)',
        },
      ],
      notes: [
        {
          title: 'Depth of the {assets}-asset review (D3).',
          text: 'All {assets} assets are classified from the equipment register and system data. Up to {criticalAssets} critical assets, selected together with your team, are checked physically on site.',
        },
      ],
      areasIntro:
        '**Digital maturity score (D4).** Scored on a simple 5-level scale across five areas:',
      areas: [
        'Equipment connectivity and sensor coverage',
        'Data reliability',
        'Data storage, dashboards and integration',
        'Monitoring and maintenance practice',
        'Readiness for analytics and predictive maintenance',
      ],
    },
    process: {
      enabled: true,
      newPage: false,
      title: 'How we work',
      stages: [
        {
          stage: 'Before Day 1',
          where: 'Remote',
          time: '3–5 days before the visit (your side)',
          what: '{clientShort} shares the data pack (Section {sec.needs}). We start early analysis.',
          output: 'Visit plan',
        },
        {
          stage: '1. On-site assessment',
          where: 'Your plant',
          time: 'Days 1–3',
          what: 'Kick-off with management; discussions with production, maintenance, electrical and IT/IoT teams; inspection of affected motors and the IoT setup; spot measurements with portable instruments where safe and permitted.',
          output: 'Site observations',
        },
        {
          stage: '2. Analysis',
          where: '{provider}',
          time: 'Days 4–6',
          what: 'Analysis of three months of IoT data and logs; motor and maintenance history; asset register; maturity scoring.',
          output: 'D1, D2, D3 drafts',
        },
        {
          stage: '3. Roadmap & presentation',
          where: '{provider}, then your team (on site or online)',
          time: 'Days 7–8',
          what: 'Architecture, roadmap, final reports and management presentation.',
          output: 'D1–D4 final',
        },
      ],
      note: '**Total: {duration}.** The clock starts when the data pack is received and plant access is confirmed.',
    },
    method: {
      enabled: true,
      newPage: false,
      title: 'How we investigate',
      intro:
        'We follow a fixed checklist, moving from the simple and external to the detailed and internal.',
      checklistTitle: 'Motor overheating: checked in this order',
      checklist: [
        'Actual temperature and its trend over time',
        'Running current against the nameplate rating (overload)',
        'Supply voltage level and phase imbalance (a small voltage imbalance can cause a much larger current imbalance in the windings)',
        'Cooling: fan, fins, ventilation, ambient temperature',
        'Starting frequency, duty cycle, and any variable-speed drive running at low speed',
        'Bearing condition, lubrication and alignment',
        'Winding and insulation condition, using existing records and test results',
      ],
      checklistNote:
        'Running a motor hot is not harmless. A common rule of thumb is that every 10°C of sustained overtemperature roughly halves insulation life, which is why finding the cause matters more than resetting the trip.',
      chainTitle: 'IoT data: traced link by link',
      chain: ['Sensor', 'Gateway', 'Network', 'Server / API', 'Database', 'Dashboard'],
      chainNote:
        'At each link we check for missing data, gaps, delays, timestamp errors, wrong tag mapping and display problems, so the failure point is identified instead of guessed.',
      evidence:
        '**Evidence first.** Causes proved by measurement or records are reported as confirmed. Causes that are likely but need more evidence are reported separately as probable, with the test needed to confirm them.',
    },
    needs: {
      enabled: true,
      newPage: false,
      title: 'What we need from {clientShort}',
      intro:
        'The {duration} schedule depends on these. Please provide them 3–5 days before the site visit.',
      items: [
        'One coordinator to arrange access, people and information.',
        'Read-only access to the IoT platform and dashboards, plus any architecture or system documentation.',
        'Equipment register for all {assets} assets.',
        'Last three months of IoT data and logs (gateway, server, API) and dashboard screenshots showing the missing or wrong data.',
        'Motor details (nameplate, load, operating pattern) and maintenance and failure history for the affected motors.',
        'Plant access, safety permissions and the availability of maintenance, electrical, production and IT/IoT staff on site days.',
      ],
      note: 'If items arrive late, the schedule moves by the same number of days. If data is incomplete, the affected findings will be reported as probable.',
    },
    fee: {
      enabled: true,
      newPage: false,
      title: 'Fee and payment',
      items: [
        {
          item: 'Professional fee (all {deliverablesWord} deliverables, {duration})',
          amount: '{fee}',
        },
        { item: 'GST', amount: 'As applicable, extra' },
        {
          item: 'Travel, accommodation and local conveyance for the site visit',
          amount: 'At actuals, extra. Estimate shared and approved by {clientShort} before travel',
        },
      ],
      paymentTitle: 'Payment terms',
      milestones: [
        { percent: 50, when: 'Advance on confirmation of the engagement' },
        { percent: 50, when: 'On submission of the final reports' },
      ],
    },
    scope: {
      enabled: true,
      newPage: false,
      title: 'Scope boundaries',
      included: [
        'Site assessment, data analysis and root-cause investigation',
        'Digital maturity score',
        'Recommended architecture and roadmap',
        'The {deliverablesWord} deliverables in Section {sec.deliverables}',
      ],
      excluded: [
        'Repair or replacement of motors, sensors, gateways or any hardware',
        'Opening, dismantling or shutting down equipment for testing',
        'New software development or IoT platform deployment',
        'Supply of sensors, gateways or other hardware',
        'Detailed testing, special instrumentation or long-term monitoring',
      ],
      notesTitle: 'Please note',
      notes: [
        'Findings depend on the quality of records, system access and inspection opportunities.',
        'Physical checks cover up to {criticalAssets} selected critical assets. All other assets are assessed from records.',
        'Changes to the scope or number of deliverables will be agreed in writing before work starts.',
      ],
    },
    after: {
      enabled: true,
      newPage: false,
      title: 'After the assessment',
      text: 'The roadmap will show what to fix first, what to strengthen next, and when predictive maintenance makes sense. If {clientShort} wants {provider} to carry out any part of it, we will submit a separate proposal with scope, timeline and cost. There is no obligation to continue with {provider} after this assessment.',
    },
    acceptance: {
      enabled: true,
      newPage: false,
      title: 'Acceptance',
      text: 'By signing, {client} confirms the scope, deliverables, fee and terms in this proposal.',
      providerName: 'Kunal Divyanshu',
      providerTitle: 'Founder & CEO, EngenX',
      showSeal: true,
    },
  },
  footer: {
    confidentiality:
      'Commercial & Confidential. Prepared for {client}. Not to be shared outside the recipient organisation without written consent from {provider}.',
  },
};

// The order of the numbered sections.
export const SECTION_ORDER = [
  'glance',
  'why',
  'deliverables',
  'process',
  'method',
  'needs',
  'fee',
  'scope',
  'after',
  'acceptance',
];
