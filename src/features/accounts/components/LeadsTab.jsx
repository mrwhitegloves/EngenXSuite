import { useState } from 'react';
import { KanbanSquare, Plus } from 'lucide-react';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, primaryButtonClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useLeadOptions, useLeads } from '../../pipeline/api.js';
import LeadEditModal from '../../pipeline/components/LeadEditModal.jsx';
import LeadsTable from '../../pipeline/components/LeadsTable.jsx';

// The Leads tab of Account 360: this company's leads (the ones the person may see), newest
// first. The same table and the same lead form as on the Pipeline page.
export default function LeadsTab({ account }) {
  const can = useCan();
  const [isCreating, setIsCreating] = useState(false);
  const options = useLeadOptions();
  const leads = useLeads({ accountId: account.id, pageSize: 100 });
  const rows = leads.data?.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Leads</h2>
        {can('opportunities', 'create') && (
          <button type="button" className={primaryButtonClass} onClick={() => setIsCreating(true)}>
            <Plus size={16} aria-hidden="true" />
            New lead
          </button>
        )}
      </div>

      <FormError message={leads.error?.message ?? options.error?.message} />
      {leads.isPending && (
        <p role="status" className="text-text-muted">
          Loading leads…
        </p>
      )}
      {leads.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={KanbanSquare}
          title="No leads yet"
          description="Add what this company may buy from you: each lead moves through the pipeline."
        />
      )}
      {rows.length > 0 && (
        <LeadsTable
          caption={`Leads of ${account.name}`}
          rows={rows}
          stages={options.data?.stages ?? []}
          showAccount={false}
        />
      )}

      {isCreating && (
        <LeadEditModal
          account={{ id: account.id, name: account.name }}
          onClose={() => setIsCreating(false)}
        />
      )}
    </section>
  );
}
