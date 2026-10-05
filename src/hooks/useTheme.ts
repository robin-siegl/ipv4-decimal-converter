import { useEffect, useLayoutEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const preferenceKey = 'ipv4-decimal-theme';
const systemQuery = '(prefers-color-scheme: dark)';

function readPreference(): Theme | null {
  try {
    const value = window.localStorage.getItem(preferenceKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  return window.matchMedia?.(systemQuery).matches ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);
  const [systemTheme, setSystemTheme] = useState(readSystemTheme);
  const theme = preference ?? systemTheme;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141616' : '#f7f7f5');
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia?.(systemQuery);
    if (!media) return;
    const updateSystemTheme = () => setSystemTheme(media.matches ? 'dark' : 'light');
    updateSystemTheme();
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    try {
      window.localStorage.setItem(preferenceKey, next);
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }

  return { theme, toggleTheme };
}
