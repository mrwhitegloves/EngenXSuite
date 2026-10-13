import { Route, Routes } from 'react-router-dom';
import CallDetailPage from './pages/CallDetailPage.jsx';
import CallLogPage from './pages/CallLogPage.jsx';

// Everything under /calls: the call log, and the page of one call.
export default function CallsRoutes() {
  return (
    <Routes>
      <Route index element={<CallLogPage />} />
      <Route path=":callId" element={<CallDetailPage />} />
    </Routes>
  );
}
