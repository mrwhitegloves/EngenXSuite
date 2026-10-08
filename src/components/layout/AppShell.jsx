import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import MobileNav from './MobileNav.jsx';

// The frame around every signed-in screen: sidebar (desktop), top bar, page area, bottom bar (phones).
export default function AppShell({ productName }) {
  return (
    <div className="flex h-screen bg-page">
      <Sidebar productName={productName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar productName={productName} />
        {/* pb-20 leaves room for the bottom bar on phones. */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
