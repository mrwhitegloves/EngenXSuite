import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import SectionNotBuilt from './components/shared/states/SectionNotBuilt.jsx';
import { NAV_ITEMS, SETTINGS_ITEM, visibleItems } from './config/navigation.js';
import AccountsRoutes from './features/accounts/AccountsRoutes.jsx';
import ConnectionsPage from './features/connections/pages/ConnectionsPage.jsx';
import ActivitiesPage from './features/activities/pages/ActivitiesPage.jsx';
import BulkPage from './features/bulk/pages/BulkPage.jsx';
import CalendarPage from './features/calendar/pages/CalendarPage.jsx';
import CallsRoutes from './features/calls/CallsRoutes.jsx';
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx';
import DocumentsPage from './features/documents/pages/DocumentsPage.jsx';
import InboxPage from './features/inbox/pages/InboxPage.jsx';
import NotificationsPage from './features/notifications/pages/NotificationsPage.jsx';
import PipelineRoutes from './features/pipeline/PipelineRoutes.jsx';
import SettingsPage from './features/settings/pages/SettingsPage.jsx';
import UsersPage from './features/users/pages/UsersPage.jsx';
import WhatsAppRoutes from './features/whatsapp/WhatsAppRoutes.jsx';
import { useCan } from './hooks/useCan.js';

// Sections that have a real page. Every other visible section shows a "not built yet" notice.
const PAGES = {
  '/accounts': AccountsRoutes,
  '/pipeline': PipelineRoutes,
  '/activities': ActivitiesPage,
  '/inbox': InboxPage,
  '/whatsapp': WhatsAppRoutes,
  '/calls': CallsRoutes,
  '/calendar': CalendarPage,
  '/documents': DocumentsPage,
  '/bulk': BulkPage,
  '/users': UsersPage,
  '/settings': SettingsPage,
};

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
        {/* Every signed-in person has notifications; it is opened from the bell, not the menu. */}
        <Route path="/notifications" element={<NotificationsPage />} />
        {/* Every person's own Gmail and Calendar connection; opened from My profile. */}
        <Route path="/connections" element={<ConnectionsPage />} />
        {sections.map((item) => {
          const Page = PAGES[item.to];
          return (
            <Route
              key={item.to}
              path={`${item.to}/*`}
              element={
                Page ? <Page /> : <SectionNotBuilt title={item.label} phase={item.phase ?? '01'} />
              }
            />
          );
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
