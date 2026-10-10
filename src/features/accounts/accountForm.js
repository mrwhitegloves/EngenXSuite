// The account form keeps every field as text (what an input holds). These two functions turn
// an account from the API into that form state, and the form state into the API's shape.

export const EMPTY_ACCOUNT_FORM = {
  name: '',
  statusId: '',
  description: '',
  industry: '',
  companyType: '',
  website: '',
  linkedinUrl: '',
  phone_number: '',
  email: '',
  hqAddressLine: '',
  hqCity: '',
  hqState: '',
  hqCountry: '',
  hqPincode: '',
  region: '',
  companySize: '',
  // Typed in rupees; sent and stored in paise.
  revenueRupees: '',
  gstin: '',
  pan: '',
  ownerId: '',
  assignedUserIds: [],
  tagIds: [],
  accountPotential: '',
  relationshipHealth: '',
  strategicImportance: '',
  existingPlc: '',
  existingScada: '',
  existingMes: '',
  existingErp: '',
};

const text = (value) => (value === null || value === undefined ? '' : String(value));

/** An account as the API sends it → form state. */
export function accountToForm(account) {
  return {
    ...EMPTY_ACCOUNT_FORM,
    name: text(account.name),
    statusId: text(account.status?.id),
    description: text(account.description),
    industry: text(account.industry),
    companyType: text(account.companyType),
    website: text(account.website),
    linkedinUrl: text(account.linkedinUrl),
    phone_number: text(account.phone_number),
    email: text(account.email),
    hqAddressLine: text(account.hq?.addressLine),
    hqCity: text(account.hq?.city),
    hqState: text(account.hq?.state),
    hqCountry: text(account.hq?.country),
    hqPincode: text(account.hq?.pincode),
    region: text(account.region),
    companySize: text(account.companySize),
    revenueRupees:
      account.annualRevenuePaise === null || account.annualRevenuePaise === undefined
        ? ''
        : String(account.annualRevenuePaise / 100),
    gstin: text(account.gstin),
    pan: text(account.pan),
    ownerId: text(account.owner?.id),
    assignedUserIds: (account.assignedUsers ?? []).map((user) => user.id),
    tagIds: (account.tags ?? []).map((tag) => tag.id),
    accountPotential: text(account.commercial?.accountPotential),
    relationshipHealth: text(account.commercial?.relationshipHealth),
    strategicImportance: text(account.commercial?.strategicImportance),
    existingPlc: text(account.industrial?.existingPlc),
    existingScada: text(account.industrial?.existingScada),
    existingMes: text(account.industrial?.existingMes),
    existingErp: text(account.industrial?.existingErp),
  };
}

const orNull = (value) => (value === '' ? null : value);

/** Form state → the body the API expects. Empty fields are sent as "clear this". */
export function formToAccountBody(form) {
  const rupees = Number(form.revenueRupees);
  const body = {
    name: form.name.trim(),
    description: form.description,
    industry: form.industry,
    companyType: form.companyType,
    website: form.website,
    linkedinUrl: form.linkedinUrl,
    phone_number: form.phone_number,
    email: form.email,
    hq: {
      addressLine: form.hqAddressLine,
      city: form.hqCity,
      state: form.hqState,
      country: form.hqCountry,
      pincode: form.hqPincode,
    },
    region: form.region,
    companySize: orNull(form.companySize),
    annualRevenuePaise:
      form.revenueRupees === '' || Number.isNaN(rupees) ? null : Math.round(rupees * 100),
    gstin: form.gstin,
    pan: form.pan,
    assignedUserIds: form.assignedUserIds,
    tagIds: form.tagIds,
    commercial: {
      accountPotential: orNull(form.accountPotential),
      relationshipHealth: orNull(form.relationshipHealth),
      strategicImportance:
        form.strategicImportance === '' ? null : Number(form.strategicImportance),
    },
    industrial: {
      existingPlc: form.existingPlc,
      existingScada: form.existingScada,
      existingMes: form.existingMes,
      existingErp: form.existingErp,
    },
  };
  // These two are ids: left out when nothing is chosen (the server then uses its default).
  if (form.statusId) body.statusId = form.statusId;
  if (form.ownerId) body.ownerId = form.ownerId;
  return body;
}

/** The parts of `body` that differ from `original` (both from formToAccountBody). */
export function changedParts(body, original) {
  return Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key]),
    ),
  );
}

/** For a new account: leave out everything that was not filled in. */
export function withoutEmptyParts(body) {
  const isEmpty = (value) =>
    value === '' || value === null || (Array.isArray(value) && value.length === 0);
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (isEmpty(value)) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const inner = Object.fromEntries(Object.entries(value).filter(([, item]) => !isEmpty(item)));
      if (Object.keys(inner).length > 0) result[key] = inner;
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Server field names (also nested ones) → the form's field names, to show an error at its input.
export const SERVER_FIELD_TO_FORM = {
  'hq.addressLine': 'hqAddressLine',
  'hq.city': 'hqCity',
  'hq.state': 'hqState',
  'hq.country': 'hqCountry',
  'hq.pincode': 'hqPincode',
  annualRevenuePaise: 'revenueRupees',
  'commercial.accountPotential': 'accountPotential',
  'commercial.relationshipHealth': 'relationshipHealth',
  'commercial.strategicImportance': 'strategicImportance',
  'industrial.existingPlc': 'existingPlc',
  'industrial.existingScada': 'existingScada',
  'industrial.existingMes': 'existingMes',
  'industrial.existingErp': 'existingErp',
};

export const STAKEHOLDER_ROLE_LABELS = {
  cxo: 'CXO / Director',
  plant_head: 'Plant head',
  digital_head: 'Digital / IT head',
  maintenance_head: 'Maintenance head',
  production_head: 'Production head',
  quality_head: 'Quality head',
  purchase: 'Purchase',
  it_ot: 'IT / OT team',
  other: 'Other',
};

export const POTENTIAL_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
export const HEALTH_LABELS = { good: 'Good', neutral: 'Neutral', at_risk: 'At risk' };
