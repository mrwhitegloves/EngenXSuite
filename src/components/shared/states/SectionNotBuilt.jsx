import { Hammer } from 'lucide-react';
import PageHeader from '../../layout/PageHeader.jsx';
import EmptyState from './EmptyState.jsx';

// A route whose screen is delivered by a later build phase. Removed from a route the moment
// its real page exists, so no finished screen ever shows this.
export default function SectionNotBuilt({ title, phase }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={Hammer}
        title={`${title} is not built yet`}
        description={`This screen is part of build phase ${phase}.`}
      />
    </>
  );
}
