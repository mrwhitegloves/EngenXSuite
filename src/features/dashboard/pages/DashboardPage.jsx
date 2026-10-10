import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import { FormError } from '../../../components/shared/form.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { apiRequest } from '../../../lib/apiClient.js';
import { TaskList } from '../../activities/components/Tasks.jsx';
import { formatDay } from '../../pipeline/leadDisplay.js';
import { rupees } from '../../pipeline/leadForm.js';

/**
 * What I should look at today. Kept under 'dashboard', which the live "tasks.changed" and
 * "opportunities.changed" events make stale (config/realtimeEvents.js).
 */
function useToday() {
  return useQuery({
    queryKey: ['dashboard', 'today'],
    queryFn: ({ signal }) => apiRequest('/dashboard/today', { signal }),
    select: (payload) => payload.data,
  });
}

function Figure({ label, value, to, tone = '' }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-surface p-3 hover:border-text-muted focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="block text-sm text-text-muted">{label}</span>
      <span className={`block text-xl font-semibold ${tone}`}>{value}</span>
    </Link>
  );
}

function Block({ title, link, empty, children, isEmpty }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {link && (
          <Link to={link.to} className="text-sm text-brand-text hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {isEmpty ? (
        <p className="rounded-md border border-dashed border-border bg-surface p-4 text-text-muted">
          {empty}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function LeadRows({ leads, show }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {leads.map((lead) => (
        <li key={lead.id} className="px-3 py-2.5 text-sm">
          <Link
            to={`/pipeline/${lead.id}`}
            className="font-medium break-words hover:text-brand-text hover:underline"
          >
            {lead.name}
          </Link>
          <p className="text-text-muted">
            {[lead.accountName, lead.stageName, lead.ownerName].filter(Boolean).join(' · ')}
          </p>
          <p className="break-words">{show(lead)}</p>
        </li>
      ))}
    </ul>
  );
}

// The dashboard: today's work for the signed-in person. Leads and tasks are only what that
// person may see. (The CEO's AI view of the whole company joins in its own phase.)
export default function DashboardPage() {
  const { user } = useAuth();
  const today = useToday();
  const firstName = user.name.split(' ')[0];
  const tasks = today.data?.tasks;
  const leads = today.data?.leads;

  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description={`Signed in as ${user.role.name}`} />
      <FormError message={today.error?.message} />
      {today.isPending && (
        <p role="status" className="text-text-muted">
          Loading your day…
        </p>
      )}

      {today.isSuccess && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tasks && (
              <>
                <Figure label="My tasks today" value={tasks.counts.today} to="/activities" />
                <Figure
                  label="My overdue tasks"
                  value={tasks.counts.overdue}
                  to="/activities?view=overdue"
                  tone={tasks.counts.overdue > 0 ? 'text-danger' : ''}
                />
              </>
            )}
            {leads && (
              <>
                <Figure
                  label="Open leads"
                  value={`${leads.openCount} · ${rupees(leads.openValuePaise)}`}
                  to="/pipeline?status=open"
                />
                {leads.unassignedCount !== null && (
                  <Figure
                    label="Leads nobody owns yet"
                    value={leads.unassignedCount}
                    to="/pipeline?view=table&ownerId=unassigned"
                    tone={leads.unassignedCount > 0 ? 'text-warning' : ''}
                  />
                )}
              </>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {tasks && (
              <>
                <Block
                  title="Overdue"
                  link={{ to: '/activities?view=overdue', label: 'All overdue' }}
                  empty="Nothing is overdue."
                  isEmpty={tasks.overdue.length === 0}
                >
                  <TaskList tasks={tasks.overdue} />
                </Block>
                <Block
                  title="Due today"
                  link={{ to: '/activities', label: 'All tasks' }}
                  empty="Nothing is due today."
                  isEmpty={tasks.today.length === 0}
                >
                  <TaskList tasks={tasks.today} />
                </Block>
              </>
            )}
            {leads && (
              <>
                <Block
                  title="Leads that need a next step"
                  empty="No lead has a next action due."
                  isEmpty={leads.needAction.length === 0}
                >
                  <LeadRows
                    leads={leads.needAction}
                    show={(lead) => (
                      <>
                        Next: {lead.nextAction?.text ?? 'not written down'}
                        <span className="text-text-muted">
                          {' '}
                          (by {formatDay(lead.nextAction?.dueAt)})
                        </span>
                      </>
                    )}
                  />
                </Block>
                <Block
                  title="Closing in the next two weeks"
                  empty="No open lead is expected to close soon."
                  isEmpty={leads.closingSoon.length === 0}
                >
                  <LeadRows
                    leads={leads.closingSoon}
                    show={(lead) => (
                      <>
                        {rupees(lead.estimatedValuePaise)}
                        <span className="text-text-muted">
                          {' '}
                          · expected {formatDay(lead.expectedCloseDate)}
                        </span>
                      </>
                    )}
                  />
                </Block>
              </>
            )}
          </div>
          {!tasks && !leads && (
            <p className="text-text-muted">Nothing to show here for your account type yet.</p>
          )}
        </div>
      )}
    </>
  );
}
