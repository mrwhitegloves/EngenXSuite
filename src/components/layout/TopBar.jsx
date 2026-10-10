import { useState } from 'react';
import { LogOut, Monitor, Moon, Plus, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import Avatar from '../shared/Avatar.jsx';
import Logo from '../shared/Logo.jsx';
import ProfileDialog from '../../features/auth/components/ProfileDialog.jsx';
import QuickAddDialog from '../../features/accounts/components/QuickAddDialog.jsx';
import NotificationBell from '../../features/notifications/components/NotificationBell.jsx';
import { useCan } from '../../hooks/useCan.js';
import { primaryButtonClass } from '../shared/form.jsx';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' };

// Three small buttons: light, dark, follow the device. On a phone there is no room for three:
// there it is one button that goes to the next theme.
function ThemeSwitch() {
  const { theme, setTheme, themes } = useTheme();
  const CurrentIcon = THEME_ICONS[theme];
  const next = themes[(themes.indexOf(theme) + 1) % themes.length];
  return (
    <>
      <button
        type="button"
        onClick={() => setTheme(next)}
        title={`Theme: ${THEME_LABELS[theme]}`}
        aria-label={`Theme: ${THEME_LABELS[theme]}. Change to ${THEME_LABELS[next]}`}
        className="rounded-md border border-border p-2 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand sm:hidden"
      >
        <CurrentIcon size={16} aria-hidden="true" />
      </button>
      <div
        role="group"
        aria-label="Theme"
        className="flex rounded-md border border-border p-0.5 max-sm:hidden"
      >
        {themes.map((option) => {
          const Icon = THEME_ICONS[option];
          const isActive = option === theme;
          return (
            <button
              key={option}
              type="button"
              title={THEME_LABELS[option]}
              aria-label={`${THEME_LABELS[option]} theme`}
              aria-pressed={isActive}
              onClick={() => setTheme(option)}
              className={[
                'rounded p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand',
                isActive ? 'bg-brand-soft text-brand-text' : 'text-text-muted hover:text-text',
              ].join(' ')}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </>
  );
}

// The top bar. Global search and the voice note join it in later tasks.
export default function TopBar({ productName }) {
  const { user, signOut } = useAuth();
  const can = useCan();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
      {/* On phones there is no sidebar, so the logo sits here. */}
      <span className="shrink-0 md:hidden">
        <Logo productName={productName} className="h-6" />
      </span>
      <span className="hidden md:block" />

      <div className="flex items-center gap-3 max-sm:gap-2">
        {/* One form for a new company together with its people. */}
        {can('accounts', 'create') && (
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            title="New company and people"
            className={`${primaryButtonClass} max-sm:px-2.5`}
          >
            <Plus size={16} aria-hidden="true" />
            {/* On phones only the plus sign shows; the word stays for screen readers. */}
            <span className="max-sm:sr-only">New</span>
          </button>
        )}
        <NotificationBell />
        <ThemeSwitch />
        {/* The user's picture (or initials) and name open "My profile". */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          aria-label="My profile"
          title="My profile"
          className="flex items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Avatar name={user.name} url={user.avatarUrl} />
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-text-muted">{user.role.name}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          title="Sign out"
          aria-label="Sign out"
          className="rounded-md border border-border p-2 text-text-muted transition-colors hover:border-brand hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>

      {isProfileOpen && <ProfileDialog onClose={() => setIsProfileOpen(false)} />}
      {isQuickAddOpen && <QuickAddDialog onClose={() => setIsQuickAddOpen(false)} />}
    </header>
  );
}
