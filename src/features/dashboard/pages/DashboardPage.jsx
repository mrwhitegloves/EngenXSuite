import { LayoutDashboard } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { useAuth } from '../../../hooks/useAuth.js';

// The dashboard gets its real blocks in phase 03 (today's priorities) and phase 09 (CEO view).
export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user.name.split(' ')[0];

  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description={`Signed in as ${user.role.name}`} />
      <EmptyState
        icon={LayoutDashboard}
        title="Your dashboard will appear here"
        description="Today's priorities, tasks and deals show up once accounts and the pipeline are in place."
      />
    </>
  );
}
