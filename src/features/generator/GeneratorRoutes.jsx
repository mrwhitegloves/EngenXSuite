import { Navigate, Route, Routes } from 'react-router-dom';
import { useCan } from '../../hooks/useCan.js';
import { DOC_KINDS } from './kinds.js';
import GeneratorEditorPage from './pages/GeneratorEditorPage.jsx';
import GeneratorListPage from './pages/GeneratorListPage.jsx';

// Everything under /generator (founder, 2026-11-12): the lists of proposals, letter heads and
// invoices, and the editor of one document.
export default function GeneratorRoutes() {
  const can = useCan();
  const first = DOC_KINDS.find((kind) => can(kind.feature));
  return (
    <Routes>
      <Route index element={first ? <Navigate to={first.path} replace /> : null} />
      <Route path=":kindPath" element={<GeneratorListPage />} />
      <Route path=":kindPath/:id" element={<GeneratorEditorPage />} />
    </Routes>
  );
}
