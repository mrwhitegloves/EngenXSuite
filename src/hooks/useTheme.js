import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient.js';
import { CURRENT_USER_KEY, useAuth } from './useAuth.js';

// Light is the default; dark and "system" are choices (decision 0003).
// Signed in: the choice is saved on the user, so it follows them to every device.
// Signed out (the sign-in page): the last choice made in this browser is used.
const STORAGE_KEY = 'theme';
export const THEMES = ['light', 'dark', 'system'];

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private windows may block storage; the theme then lasts for this visit only.
  }
}

function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localTheme, setLocalTheme] = useState(readStoredTheme);
  const theme = user?.theme ?? localTheme;

  const saveMutation = useMutation({
    mutationFn: (next) => apiRequest('/auth/me', { method: 'PATCH', body: { theme: next } }),
    // Show the new theme at once; if saving fails, the next load simply shows the saved one.
    onMutate: (next) => {
      queryClient.setQueryData(CURRENT_USER_KEY, (current) =>
        current ? { ...current, theme: next } : current,
      );
    },
  });
  const saveTheme = saveMutation.mutate;

  // Apply the theme to the page, and in "system" mode follow the operating system.
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };
    apply();
    storeTheme(theme);
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = useCallback(
    (next) => {
      setLocalTheme(next);
      if (user) saveTheme(next);
    },
    [user, saveTheme],
  );

  return { theme, setTheme, themes: THEMES };
}
