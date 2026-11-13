// Filling a proposal's client from a company picked in Accounts (AccountPicker): name, the
// short name used inside sentences, location and plant location. Shared by the proposal templates.

/** "Tata Steel Pvt. Ltd." → "Tata Steel": the name used inside sentences. */
export const shortName = (name) =>
  name
    .replace(/[\s,]+(private|pvt\.?)\s+(limited|ltd\.?)\s*$/i, '')
    .replace(/[\s,]+(limited|ltd\.?)\s*$/i, '')
    .trim();

/** A company picked from Accounts fills the client's name and location. */
export function applyAccount(data, company) {
  const address = company.hq ?? company.billingAddress ?? {};
  return {
    ...data,
    client: {
      ...data.client,
      name: company.name,
      shortName: shortName(company.name),
      location: [address.city, address.state, address.country].filter(Boolean).join(', '),
      plantLocation: address.state || address.city || '',
    },
  };
}
