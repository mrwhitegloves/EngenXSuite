import {
  BarChart3,
  Building2,
  CalendarDays,
  FolderOpen,
  Globe,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

// The one list of main navigation items (Master Prompt Section 3, plus Website and Chat).
// `features`: the user needs the "view" permission on at least one of them to see the item.
// No `features` means every signed-in user sees it.
// `phase`: which build phase delivers the screen; until then the route shows a short notice.
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: Building2, features: ['accounts'], phase: '02' },
  {
    to: '/pipeline',
    label: 'Pipeline',
    icon: KanbanSquare,
    features: ['opportunities'],
    phase: '03',
  },
  { to: '/activities', label: 'Activities', icon: ListChecks, features: ['tasks'], phase: '03' },
  {
    to: '/inbox',
    label: 'Inbox',
    icon: Inbox,
    features: ['email', 'whatsapp', 'calls'],
    phase: '06',
  },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, features: ['meetings'], phase: '06' },
  { to: '/documents', label: 'Documents', icon: FolderOpen, features: ['documents'], phase: '08' },
  { to: '/reports', label: 'Reports', icon: BarChart3, features: ['reports'], phase: '09' },
  {
    to: '/ai-insights',
    label: 'AI Insights',
    icon: Sparkles,
    features: ['ai_insights'],
    phase: '09',
  },
  { to: '/website', label: 'Website', icon: Globe, features: ['website'], phase: 'W1' },
  { to: '/chat', label: 'Chat', icon: MessagesSquare, features: ['chat'], phase: '12' },
  // Login accounts of the team (decision 0009). Not to be confused with Accounts = customer companies.
  { to: '/users', label: 'Users', icon: Users, features: ['users'] },
];

export const SETTINGS_ITEM = {
  to: '/settings',
  label: 'Settings',
  icon: Settings,
  features: ['settings'],
};

// The items shown in the bottom bar on phones; everything else is behind "More".
export const MOBILE_PRIMARY_PATHS = ['/', '/pipeline', '/activities', '/inbox'];

/** Keep only the items the user may see. `can` comes from useCan(). */
export function visibleItems(items, can) {
  return items.filter((item) => !item.features || item.features.some((feature) => can(feature)));
}
