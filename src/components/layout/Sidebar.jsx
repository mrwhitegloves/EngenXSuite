import { NavLink } from 'react-router-dom';
import { NAV_ITEMS, SETTINGS_ITEM, visibleItems } from '../../config/navigation.js';
import { useCan } from '../../hooks/useCan.js';

// One navigation link. The active item gets the red marker on its left edge.
function SidebarLink({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          'focus-visible:outline-2 focus-visible:outline-brand',
          isActive
            ? 'bg-white/10 font-medium text-on-sidebar before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand'
            : 'text-on-sidebar/70 hover:bg-white/5 hover:text-on-sidebar',
        ].join(' ')
      }
    >
      <Icon size={18} aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

// The black sidebar (desktop). The same in light and dark mode.
export default function Sidebar({ productName }) {
  const can = useCan();
  const items = visibleItems(NAV_ITEMS, can);
  const showSettings = visibleItems([SETTINGS_ITEM], can).length > 0;

  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 px-4 text-on-sidebar">
        <span className="h-5 w-1 rounded-full bg-brand" aria-hidden="true" />
        <span className="truncate font-semibold">{productName}</span>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {items.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>

      {showSettings && (
        <div className="border-t border-white/10 p-2">
          <SidebarLink item={SETTINGS_ITEM} />
        </div>
      )}
    </aside>
  );
}
