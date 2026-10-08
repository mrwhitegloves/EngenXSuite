import { useCallback, useEffect, useState } from 'react';

// Light is the default; dark and "system" are choices (decision 0003).
// Until login exists the choice is kept in this browser; later it is also saved on the user record.
const STORAGE_KEY = 'theme';
const THEMES = ['light', 'dark', 'system'];

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };
    apply();
    if (theme !== 'system') return undefined;
    // In "system" mode follow the operating system when it switches.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private windows may block storage; the theme then lasts for this visit only.
    }
  }, []);

  return { theme, setTheme, themes: THEMES };
}
