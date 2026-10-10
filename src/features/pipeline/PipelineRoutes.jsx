import { Route, Routes } from 'react-router-dom';
import LeadPage from './pages/LeadPage.jsx';
import PipelinePage from './pages/PipelinePage.jsx';

// Everything under /pipeline: the board and table of leads, and one lead's own page.
export default function PipelineRoutes() {
  return (
    <Routes>
      <Route index element={<PipelinePage />} />
      <Route path=":leadId" element={<LeadPage />} />
    </Routes>
  );
}
