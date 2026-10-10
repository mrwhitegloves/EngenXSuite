import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { LOGOS } from '../../config/branding.js';
import { NAV_ITEMS, SETTINGS_ITEM, visibleItems } from '../../config/navigation.js';
import { useCan } from '../../hooks/useCan.js';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed.js';

// One navigation link. The active item gets the red marker on its left edge.
// Collapsed: only the icon shows, and the name appears beside it on hover or keyboard focus.
function SidebarLink({ item, isCollapsed }) {
  const Icon = item.icon;
  // Where to draw the name label: null = hidden. It is placed with fixed coordinates, because
  // the scrolling menu would cut off anything that sticks out of it.
  const [labelAt, setLabelAt] = useState(null);

  function showLabel(event) {
    if (!isCollapsed) return;
    const box = event.currentTarget.getBoundingClientRect();
    setLabelAt({ top: box.top + box.height / 2, left: box.right + 10 });
  }
  const hideLabel = () => setLabelAt(null);

  return (
    <>
      <NavLink
        to={item.to}
        end={item.end}
        aria-label={isCollapsed ? item.label : undefined}
        onMouseEnter={showLabel}
        onMouseLeave={hideLabel}
        onFocus={showLabel}
        onBlur={hideLabel}
        onClick={hideLabel}
        className={({ isActive }) =>
          [
            'relative flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
            'focus-visible:outline-2 focus-visible:outline-brand',
            isCollapsed ? 'justify-center px-0' : 'px-3',
            isActive
              ? 'bg-white/10 font-medium text-on-sidebar before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand'
              : 'text-on-sidebar/70 hover:bg-white/5 hover:text-on-sidebar',
          ].join(' ')
        }
      >
        <Icon size={18} className="shrink-0" aria-hidden="true" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </NavLink>

      {isCollapsed && labelAt && (
        <span
          role="tooltip"
          style={{ top: labelAt.top, left: labelAt.left }}
          className="pointer-events-none fixed z-50 -translate-y-1/2 rounded-md bg-sidebar px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-on-sidebar shadow-lg ring-1 ring-white/15"
        >
          {item.label}
        </span>
      )}
    </>
  );
}

// The logo at the top. Open: the full word mark. Collapsed: the short mark.
function SidebarLogo({ productName, isCollapsed }) {
  // The short mark for dark backgrounds may not exist yet: then the light one is shown on a
  // white tile, so it stays readable on the black sidebar.
  const [darkShortMissing, setDarkShortMissing] = useState(false);

  if (!isCollapsed) {
    return <img src={LOGOS.full.onDark} alt={productName} className="h-7 w-auto max-w-[9.5rem]" />;
  }
  if (darkShortMissing) {
    return (
      <span className="flex size-9 items-center justify-center rounded-md">
        <img src={LOGOS.short.onLight} alt={productName} className="size-10" />
      </span>
    );
  }
  return (
    <img
      src={LOGOS.short.onDark}
      alt={productName}
      className="size-8"
      onError={() => setDarkShortMissing(true)}
    />
  );
}

// The black sidebar (desktop). The same in light and dark mode.
// It can be collapsed to a narrow strip of icons; the choice is remembered in this browser.
export default function Sidebar({ productName }) {
  const can = useCan();
  const [isCollapsed, toggleCollapsed] = useSidebarCollapsed();
  const items = visibleItems(NAV_ITEMS, can);
  const showSettings = visibleItems([SETTINGS_ITEM], can).length > 0;
  const ToggleIcon = isCollapsed ? ChevronRight : ChevronLeft;

  return (
    <aside
      className={`relative hidden shrink-0 flex-col bg-sidebar transition-[width] duration-200 md:flex ${isCollapsed ? 'w-16' : 'w-56'}`}
    >
      <div
        className={`flex h-14 shrink-0 items-center text-on-sidebar ${isCollapsed ? 'justify-center' : 'px-4'}`}
      >
        <SidebarLogo productName={productName} isCollapsed={isCollapsed} />
      </div>

      {/* Sits on the sidebar's right edge, like a handle. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
        title={isCollapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
        className="absolute top-4 -right-3 z-20 flex size-6 items-center justify-center rounded-full bg-sidebar text-on-sidebar/80 shadow ring-1 ring-white/25 transition-colors hover:text-on-sidebar focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ToggleIcon size={14} aria-hidden="true" />
      </button>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {items.map((item) => (
          <SidebarLink key={item.to} item={item} isCollapsed={isCollapsed} />
        ))}
      </nav>

      {showSettings && (
        <div className="border-t border-white/10 p-2">
          <SidebarLink item={SETTINGS_ITEM} isCollapsed={isCollapsed} />
        </div>
      )}
    </aside>
  );
}
