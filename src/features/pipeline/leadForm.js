// The lead form keeps every field as text (what an input holds), plus lists of ids.
// These functions turn a lead from the API into that form state and back into the API's shape.

export const EMPTY_LEAD_FORM = {
  name: '',
  accountId: '',
  primaryContactId: '',
  plantId: '',
  leadStatusId: '',
  stageId: '',
  closeReason: '',
  lostToCompetitor: '',
  // Typed in rupees; sent and stored in paise.
  valueRupees: '',
  probability: '',
  expectedCloseDate: '',
  solutionCategoryIds: [],
  tagIds: [],
  requirement: '',
  problemStatement: '',
  expectedImpact: '',
  nextActionText: '',
  nextActionDueAt: '',
  competitor: '',
  budgetStatus: '',
  technicalFeasibility: '',
  decisionTimeline: '',
  riskLevel: '',
  riskNote: '',
  ownerId: '',
  assignedUserIds: [],
};

const text = (value) => (value === null || value === undefined ? '' : String(value));
const pad = (number) => String(number).padStart(2, '0');

/** A stored moment → the "YYYY-MM-DD" the date input shows, as that day is in India. */
const toDayInput = (value) =>
  value
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value))
    : '';

/** A stored moment → the value of a date-and-time input (the browser's own time zone). */
function toMomentInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A lead as the API sends it → form state. */
export function leadToForm(lead) {
  return {
    ...EMPTY_LEAD_FORM,
    name: text(lead.name),
    accountId: text(lead.account?.id),
    primaryContactId: text(lead.primaryContact?.id),
    plantId: text(lead.plant?.id),
    leadStatusId: text(lead.leadStatus?.id),
    stageId: text(lead.stage?.id),
    closeReason: text(lead.closeReason),
    lostToCompetitor: text(lead.lostToCompetitor),
    valueRupees:
      lead.estimatedValuePaise === null || lead.estimatedValuePaise === undefined
        ? ''
        : String(lead.estimatedValuePaise / 100),
    probability: text(lead.probability),
    expectedCloseDate: toDayInput(lead.expectedCloseDate),
    solutionCategoryIds: (lead.solutionCategories ?? []).map((item) => item.id),
    tagIds: (lead.tags ?? []).map((tag) => tag.id),
    requirement: text(lead.requirement),
    problemStatement: text(lead.problemStatement),
    expectedImpact: text(lead.expectedImpact),
    nextActionText: text(lead.nextAction?.text),
    nextActionDueAt: toMomentInput(lead.nextAction?.dueAt),
    competitor: text(lead.competitor),
    budgetStatus: text(lead.budgetStatus),
    technicalFeasibility: text(lead.technicalFeasibility),
    decisionTimeline: text(lead.decisionTimeline),
    riskLevel: text(lead.risk?.level),
    riskNote: text(lead.risk?.note),
    ownerId: text(lead.owner?.id),
    assignedUserIds: (lead.assignedUsers ?? []).map((user) => user.id),
  };
}

const orNull = (value) => (value === '' ? null : value);
const numberOrNull = (value) =>
  value === '' || Number.isNaN(Number(value)) ? null : Number(value);

/**
 * One form field → the part of the API body it fills. Kept per field, so that "what changed"
 * can be worked out field by field (the orange highlight) and only that is sent.
 */
const TO_BODY = {
  name: (form) => ({ name: form.name.trim() }),
  primaryContactId: (form) => ({ primaryContactId: orNull(form.primaryContactId) }),
  plantId: (form) => ({ plantId: orNull(form.plantId) }),
  leadStatusId: (form) => (form.leadStatusId ? { leadStatusId: form.leadStatusId } : {}),
  stageId: (form) => (form.stageId ? { stageId: form.stageId } : {}),
  closeReason: (form) => ({ closeReason: orNull(form.closeReason) }),
  lostToCompetitor: (form) => ({ lostToCompetitor: orNull(form.lostToCompetitor) }),
  valueRupees: (form) => {
    const rupees = numberOrNull(form.valueRupees);
    return { estimatedValuePaise: rupees === null ? null : Math.round(rupees * 100) };
  },
  probability: (form) => ({ probability: numberOrNull(form.probability) }),
  expectedCloseDate: (form) => ({ expectedCloseDate: orNull(form.expectedCloseDate) }),
  solutionCategoryIds: (form) => ({ solutionCategoryIds: form.solutionCategoryIds }),
  tagIds: (form) => ({ tagIds: form.tagIds }),
  requirement: (form) => ({ requirement: orNull(form.requirement) }),
  problemStatement: (form) => ({ problemStatement: orNull(form.problemStatement) }),
  expectedImpact: (form) => ({ expectedImpact: orNull(form.expectedImpact) }),
  nextActionText: (form) => ({ nextAction: { text: orNull(form.nextActionText) } }),
  nextActionDueAt: (form) => ({
    nextAction: {
      dueAt: form.nextActionDueAt ? new Date(form.nextActionDueAt).toISOString() : null,
    },
  }),
  competitor: (form) => ({ competitor: orNull(form.competitor) }),
  budgetStatus: (form) => ({ budgetStatus: orNull(form.budgetStatus) }),
  technicalFeasibility: (form) => ({ technicalFeasibility: orNull(form.technicalFeasibility) }),
  decisionTimeline: (form) => ({ decisionTimeline: orNull(form.decisionTimeline) }),
  riskLevel: (form) => ({ risk: { level: orNull(form.riskLevel) } }),
  riskNote: (form) => ({ risk: { note: orNull(form.riskNote) } }),
  ownerId: (form) => ({ ownerId: orNull(form.ownerId) }),
  assignedUserIds: (form) => ({ assignedUserIds: form.assignedUserIds }),
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The names of the form fields whose value differs from the starting value. */
export function changedFields(form, initial) {
  return Object.keys(TO_BODY).filter((field) => !same(form[field], initial[field]));
}

/** The API body for the given form fields. Small objects (next action, risk) are merged. */
export function formToLeadBody(form, fieldNames) {
  const body = {};
  for (const field of fieldNames) {
    for (const [key, value] of Object.entries(TO_BODY[field](form))) {
      const isPart = value && typeof value === 'object' && !Array.isArray(value);
      body[key] = isPart ? { ...body[key], ...value } : value;
    }
  }
  return body;
}

/** For a new lead: every filled-in field, and nothing that was left empty. */
export function newLeadBody(form) {
  const filled = Object.keys(TO_BODY).filter((field) =>
    Array.isArray(form[field]) ? form[field].length > 0 : form[field] !== '',
  );
  // "No owner chosen" on a new lead means "me": the server decides that when it is left out.
  return { accountId: form.accountId, ...formToLeadBody(form, filled) };
}

export const BUDGET_LABELS = {
  unknown: 'Not known',
  no_budget: 'No budget',
  planned: 'Planned',
  approved: 'Approved',
};
export const FEASIBILITY_LABELS = {
  unknown: 'Not known',
  feasible: 'Feasible',
  needs_study: 'Needs a study',
  not_feasible: 'Not feasible',
};
export const RISK_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

/** "₹2,50,00,000" from paise; "—" when there is no value. */
export const rupees = (paise) =>
  paise === null || paise === undefined
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(paise / 100);
