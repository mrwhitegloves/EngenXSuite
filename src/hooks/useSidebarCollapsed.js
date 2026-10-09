import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

function readSaved() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // Storage can be blocked (private mode): the sidebar simply starts open.
    return false;
  }
}

/**
 * Whether the desktop sidebar is collapsed to icons. Remembered in this browser, so it stays
 * the way the user left it. (A layout choice of one screen, so it is not saved on the server.)
 * @returns {[boolean, () => void]}
 */
export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(readSaved);

  const toggle = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Not saved; it still works until the page is closed.
      }
      return next;
    });
  }, []);

  return [isCollapsed, toggle];
}
