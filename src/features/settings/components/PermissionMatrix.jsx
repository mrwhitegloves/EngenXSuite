// The permission table of one account type: a row per feature, a column per action, and in each
// cell how far the permission reaches. Features and actions come from the server's catalogue.

const FEATURE_LABELS = {
  accounts: 'Accounts',
  plants: 'Plants',
  contacts: 'Contacts',
  opportunities: 'Leads and opportunities',
  tasks: 'Tasks',
  calls: 'Calls',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meetings: 'Meetings',
  proposals: 'Proposals',
  invoices: 'Invoices',
  documents: 'Documents',
  reports: 'Reports',
  ai_insights: 'AI insights',
  ceo_dashboard: 'CEO dashboard',
  campaigns: 'Campaigns',
  imports: 'CSV import',
  website: 'Website',
  chat: 'Team chat',
  users: 'Users',
  settings: 'Settings',
  audit: 'Audit log',
};

const SCOPE_LABELS = {
  '': 'No',
  own: 'Own',
  assigned: 'Assigned',
  team: 'Team',
  all: 'All',
};

const labelOf = (key) => FEATURE_LABELS[key] ?? key;
const capitalise = (text) => text.slice(0, 1).toUpperCase() + text.slice(1);

/** Read grants ([{ feature, action, scope }]) as a lookup: "feature:action" → scope. */
export function grantsToMap(grants) {
  return Object.fromEntries(
    grants.map((grant) => [`${grant.feature}:${grant.action}`, grant.scope]),
  );
}

/** The reverse: only the cells that have a scope become grants. */
export function mapToGrants(map) {
  return Object.entries(map)
    .filter(([, scope]) => scope)
    .map(([key, scope]) => {
      const [feature, action] = key.split(':');
      return { feature, action, scope };
    });
}

export default function PermissionMatrix({ catalogue, value, savedValue, onChange, disabled }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-text-muted">
          <tr>
            <th className="sticky left-0 bg-surface px-3 py-2 font-medium">Feature</th>
            {catalogue.actions.map((action) => (
              <th key={action} className="px-2 py-2 font-medium">
                {capitalise(action)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {catalogue.features.map((feature) => (
            <tr key={feature} className="border-b border-border last:border-0">
              <th scope="row" className="sticky left-0 bg-surface px-3 py-1.5 font-medium">
                {labelOf(feature)}
              </th>
              {catalogue.actions.map((action) => {
                const key = `${feature}:${action}`;
                const scope = value[key] ?? '';
                const isChanged = scope !== (savedValue[key] ?? '');
                return (
                  <td key={action} className="px-2 py-1.5">
                    <select
                      aria-label={`${labelOf(feature)}: ${capitalise(action)}`}
                      value={scope}
                      disabled={disabled}
                      onChange={(event) => onChange({ ...value, [key]: event.target.value })}
                      className={[
                        'rounded-md border px-1.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-brand',
                        // Orange marks a cell that was changed and not saved yet.
                        isChanged
                          ? 'border-edited bg-edited-soft'
                          : scope
                            ? 'border-border bg-surface'
                            : 'border-border bg-surface text-text-muted',
                      ].join(' ')}
                    >
                      <option value="">{SCOPE_LABELS['']}</option>
                      {catalogue.scopes.map((option) => (
                        <option key={option} value={option}>
                          {SCOPE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
