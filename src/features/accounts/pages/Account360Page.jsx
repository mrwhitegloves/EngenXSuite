import { useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { TagChips } from '../../../components/shared/Tags.jsx';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { HEALTH_LABELS, POTENTIAL_LABELS } from '../accountForm.js';
import { RecordTasks } from '../../activities/components/Tasks.jsx';
import Timeline from '../../activities/components/Timeline.jsx';
import RecordCalls from '../../calls/components/RecordCalls.jsx';
import { useAccount } from '../api.js';
import AccountFormDialog from '../components/AccountFormDialog.jsx';
import LeadsTab from '../components/LeadsTab.jsx';
import PeopleTab from '../components/PeopleTab.jsx';
import PlantsTab from '../components/PlantsTab.jsx';

const rupees = (paise) =>
  paise === null || paise === undefined
    ? null
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(paise / 100);

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(
    new Date(value),
  );

// A titled block of "label: value" lines. Lines without a value are left out; a block with no
// values at all says so instead of showing an empty box.
function Block({ title, lines }) {
  const filled = lines.filter(([, value]) => value !== null && value !== undefined && value !== '');
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-text-muted uppercase">{title}</h3>
      {filled.length === 0 ? (
        <p className="text-text-muted">Nothing filled in yet.</p>
      ) : (
        <dl className="space-y-1.5">
          {filled.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
              <dt className="text-text-muted">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

const link = (href, label) => (
  <a
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel="noreferrer"
    className="text-brand-text underline-offset-2 hover:underline"
  >
    {label}
  </a>
);

function Overview({ account }) {
  const hq = account.hq ?? {};
  const address = [hq.addressLine, hq.city, hq.state, hq.pincode, hq.country]
    .filter(Boolean)
    .join(', ');
  const commercial = account.commercial ?? {};
  const industrial = account.industrial ?? {};
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Block
        title="Company"
        lines={[
          ['About', account.description],
          ['Industry', account.industry],
          ['Type', account.companyType],
          ['Size', account.companySize && `${account.companySize} people`],
          [
            'Phone',
            account.phone_number && link(`tel:${account.phone_number}`, account.phone_number),
          ],
          ['Email', account.email && link(`mailto:${account.email}`, account.email)],
          ['Website', account.website && link(account.website, account.website)],
          ['LinkedIn', account.linkedinUrl && link(account.linkedinUrl, 'Open page')],
          [
            'Group company',
            account.parent && link(`/accounts/${account.parent.id}`, account.parent.name),
          ],
        ]}
      />
      <Block
        title="Head office"
        lines={[
          ['Address', address],
          ['Region', account.region],
        ]}
      />
      <Block
        title="Commercial"
        lines={[
          ['Yearly revenue', rupees(account.annualRevenuePaise)],
          ['Potential', POTENTIAL_LABELS[commercial.accountPotential]],
          ['Relationship', HEALTH_LABELS[commercial.relationshipHealth]],
          [
            'Importance',
            commercial.strategicImportance && `${commercial.strategicImportance} of 5`,
          ],
          ['GSTIN', account.gstin],
          ['PAN', account.pan],
        ]}
      />
      <Block
        title="Systems in use"
        lines={[
          ['PLC', industrial.existingPlc],
          ['SCADA', industrial.existingScada],
          ['MES', industrial.existingMes],
          ['ERP', industrial.existingErp],
        ]}
      />
      <Block
        title="Who works on it"
        lines={[
          ['Owner', account.owner?.name],
          ['Also assigned', account.assignedUsers.map((user) => user.name).join(', ')],
          ['Added by', account.formFilledBy?.name],
          ['Added on', formatDate(account.createdAt)],
          ['Source', account.source === 'manual' ? 'Typed in' : account.source],
          ['Campaign', account.sourceDetail?.campaign],
          ['Form', account.sourceDetail?.form],
        ]}
      />
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People', feature: 'contacts' },
  { id: 'plants', label: 'Plants', feature: 'plants' },
  { id: 'leads', label: 'Leads', feature: 'opportunities' },
  { id: 'timeline', label: 'Timeline' },
];

// Account 360: everything known about one company, in one place.
// Documents join as a tab when that part is built.
export default function Account360Page() {
  const { accountId } = useParams();
  const can = useCan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const account = useAccount(accountId);

  const tabs = TABS.filter((tab) => !tab.feature || can(tab.feature, 'view'));
  const tab = tabs.find((item) => item.id === searchParams.get('tab')) ?? tabs[0];

  const backLink = (
    <Link
      to="/accounts"
      className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      All accounts
    </Link>
  );

  if (account.isPending) {
    return (
      <>
        {backLink}
        <p role="status" className="text-text-muted">
          Loading the account…
        </p>
      </>
    );
  }
  if (account.isError) {
    return (
      <>
        {backLink}
        <FormError
          message={
            account.error.status === 404
              ? 'This account does not exist, or it is not one of yours.'
              : account.error.message
          }
        />
      </>
    );
  }

  const data = account.data;
  return (
    <>
      {backLink}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{data.name}</h1>
            {data.status && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                {data.status.name}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-text-muted">
            <span className="font-mono text-xs">{data.accountCode}</span>
            {data.industry && <> · {data.industry}</>}
            {data.hq?.city && <> · {data.hq.city}</>}
            {data.owner?.name && <> · Owner: {data.owner.name}</>}
          </p>
          <TagChips tags={data.tags} className="mt-2" />
        </div>
        {data.permissions.canEdit && (
          <button type="button" className={secondaryButtonClass} onClick={() => setIsEditing(true)}>
            <Pencil size={16} aria-hidden="true" />
            Edit
          </button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Account sections"
        className="mb-4 flex flex-wrap gap-1 border-b border-border"
      >
        {tabs.map((item) => {
          const isCurrent = item.id === tab.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setSearchParams(item.id === tabs[0].id ? {} : { tab: item.id })}
              className={[
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand',
                isCurrent
                  ? 'border-brand text-brand-text'
                  : 'border-transparent text-text-muted hover:text-text',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab.id === 'overview' && <Overview account={data} />}
      {tab.id === 'people' && <PeopleTab accountId={data.id} />}
      {tab.id === 'plants' && <PlantsTab accountId={data.id} />}
      {tab.id === 'leads' && <LeadsTab account={data} />}
      {tab.id === 'timeline' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="font-semibold">What happened</h2>
            <Timeline
              target={{ accountId: data.id }}
              canWrite={data.permissions.canEdit}
              showLead
            />
          </div>
          <div className="space-y-6">
            {can('tasks', 'view') && <RecordTasks target={{ accountId: data.id }} />}
            {can('calls', 'view') && <RecordCalls target={{ accountId: data.id }} />}
          </div>
        </div>
      )}

      {isEditing && <AccountFormDialog accountId={data.id} onClose={() => setIsEditing(false)} />}
    </>
  );
}
