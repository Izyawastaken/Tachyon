import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { COLOR_ROLES, PRESETS, THEME_STORAGE_KEY, foregroundOn, loadThemes, luminance, type AppearancePreferences, type Theme, type ThemeState } from './model';

interface ThemeContextValue {
  active: Theme;
  themes: Theme[];
  storageError: boolean;
  preferences: AppearancePreferences;
  updatePreferences: (preferences: Partial<AppearancePreferences>) => void;
  applyTheme: (id: string) => boolean;
  saveTheme: (theme: Theme, apply: boolean) => boolean;
  deleteTheme: (id: string) => boolean;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadThemes);
  const [storageError, setStorageError] = useState(false);
  const themes = [...PRESETS, ...state.custom];
  const active = themes.find(theme => theme.id === state.activeId) ?? PRESETS[0];
  const commit = (next: ThemeState) => {
    setState(next);
    return true;
  };
  useEffect(() => {
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const { key } of COLOR_ROLES) root.style.setProperty(`--theme-${key}`, active.colors[key]);
    root.style.setProperty('--theme-on-primary', foregroundOn(active.colors.primary, active.colors.text));
    root.style.setProperty('--theme-on-secondary', foregroundOn(active.colors.secondary, active.colors.text));
    root.style.colorScheme = luminance(active.colors.background) < .179 ? 'dark' : 'light';
    root.dataset.theme = active.id;
    root.classList.toggle('dark', luminance(active.colors.background) < .179);
  }, [active]);
  useLayoutEffect(() => {
    document.documentElement.dataset.density = state.preferences.density;
    document.documentElement.dataset.reducedMotion = String(state.preferences.reducedMotion);
  }, [state.preferences]);

  return <ThemeContext.Provider value={{ active, themes, storageError, preferences: state.preferences,
    updatePreferences: preferences => setState(current => ({ ...current, preferences: { ...current.preferences, ...preferences } })),
    applyTheme: id => themes.some(theme => theme.id === id) ? commit({ ...state, activeId: id }) : false,
    saveTheme: (theme, apply) => {
      const exists = state.custom.some(item => item.id === theme.id);
      if (!exists && state.custom.length >= 100) return false;
      return commit({ ...state, activeId: apply ? theme.id : state.activeId, custom: exists ? state.custom.map(item => item.id === theme.id ? theme : item) : [...state.custom, theme] });
    },
    deleteTheme: id => commit({ ...state, activeId: state.activeId === id ? PRESETS[0].id : state.activeId, custom: state.custom.filter(theme => theme.id !== id) }),
  }}>{children}</ThemeContext.Provider>;
}
export function useThemes() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('Themes must be used within ThemeProvider');
  return value;
}
export function useAppearanceMotion() {
  const systemReduced = useReducedMotion();
  const { preferences } = useThemes();
  return systemReduced || preferences.reducedMotion;
}
