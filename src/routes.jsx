import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import SectionNotBuilt from './components/shared/states/SectionNotBuilt.jsx';
import { NAV_ITEMS, SETTINGS_ITEM, visibleItems } from './config/navigation.js';
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx';
import { useCan } from './hooks/useCan.js';

// Every signed-in route, in one file. A route exists only for sections the user may see;
// any other address goes back to the dashboard. (The server still checks every request.)
export default function AppRoutes({ productName }) {
  const can = useCan();
  const sections = visibleItems([...NAV_ITEMS, SETTINGS_ITEM], can).filter(
    (item) => item.to !== '/',
  );

  return (
    <Routes>
      <Route element={<AppShell productName={productName} />}>
        <Route index element={<DashboardPage />} />
        {sections.map((item) => (
          <Route
            key={item.to}
            path={`${item.to}/*`}
            element={<SectionNotBuilt title={item.label} phase={item.phase ?? '01'} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
