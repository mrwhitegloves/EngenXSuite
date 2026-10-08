import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import {
  MOBILE_PRIMARY_PATHS,
  NAV_ITEMS,
  SETTINGS_ITEM,
  visibleItems,
} from '../../config/navigation.js';
import { useCan } from '../../hooks/useCan.js';

const tabClass = (isActive) =>
  [
    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] focus-visible:outline-2 focus-visible:outline-brand',
    isActive ? 'font-medium text-brand-text' : 'text-text-muted',
  ].join(' ');

// Phones: a bottom bar with the four most used screens and a "More" sheet for the rest.
export default function MobileNav() {
  const can = useCan();
  const location = useLocation();
  const [openedAt, setOpenedAt] = useState(null);
  // The sheet closes by itself when the user moves to another screen.
  const isMoreOpen = openedAt === location.pathname;

  const all = visibleItems([...NAV_ITEMS, SETTINGS_ITEM], can);
  const primary = all.filter((item) => MOBILE_PRIMARY_PATHS.includes(item.to));
  const more = all.filter((item) => !MOBILE_PRIMARY_PATHS.includes(item.to));

  return (
    <>
      {isMoreOpen && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-surface p-2 md:hidden">
          <nav aria-label="More" className="grid grid-cols-3 gap-1">
            {more.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => tabClass(isActive)}
                >
                  <Icon size={20} aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex h-14 border-t border-border bg-surface md:hidden"
      >
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => tabClass(isActive)}
            >
              <Icon size={20} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
        {more.length > 0 && (
          <button
            type="button"
            aria-expanded={isMoreOpen}
            onClick={() => setOpenedAt(isMoreOpen ? null : location.pathname)}
            className={tabClass(isMoreOpen)}
          >
            {isMoreOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
            More
          </button>
        )}
      </nav>
    </>
  );
}
