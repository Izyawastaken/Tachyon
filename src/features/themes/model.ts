import type { CSSProperties } from 'react';

export const COLOR_ROLES = [
  { key: 'background', label: 'Background', description: 'The foundation of your launcher.' },
  { key: 'surface', label: 'Surface', description: 'Cards, panels, and controls.' },
  { key: 'secondary', label: 'Raised surface', description: 'Layers that sit above the rest.' },
  { key: 'border', label: 'Border', description: 'Outlines and quiet separation.' },
  { key: 'primary', label: 'Accent', description: 'Actions and things worth noticing.' },
  { key: 'text', label: 'Text', description: 'The words that bring it together.' },
] as const;
export type ColorRole = typeof COLOR_ROLES[number]['key'];
export type Palette = Record<ColorRole, string>;
export interface Theme { id: string; name: string; colors: Palette }
export interface AppearancePreferences { reducedMotion: boolean; density: 'Comfortable' | 'Compact'; sidebar: 'Rail' | 'Expanded' }
export const DEFAULT_APPEARANCE: AppearancePreferences = { reducedMotion: false, density: 'Comfortable', sidebar: 'Rail' };
export interface ThemeState { version: 1; activeId: string; custom: Theme[]; preferences: AppearancePreferences }
export function parseAppearance(value: unknown): AppearancePreferences {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { reducedMotion: source.reducedMotion === true, density: source.density === 'Compact' ? 'Compact' : 'Comfortable', sidebar: source.sidebar === 'Expanded' ? 'Expanded' : 'Rail' };
}
export const THEME_STORAGE_KEY = 'tachyon.themes.v1';
export const PRESETS: Theme[] = [
  { id: 'espresso', name: 'Espresso', colors: { background: '#0D0807', surface: '#3E2723', secondary: '#633E38', border: '#211513', primary: '#754942', text: '#F3E9E6' } },
  { id: 'sakura', name: 'Sakura Milk', colors: { background: '#FEF9FA', surface: '#FBE9EF', secondary: '#F4C9D6', border: '#EFB0C3', primary: '#EB9EB5', text: '#3A1F2B' } },
  { id: 'almond', name: 'Almond Milk', colors: { background: '#FEFDFC', surface: '#FBF9F5', secondary: '#F5F0E6', border: '#EDE4D2', primary: '#B69A71', text: '#2B241D' } },
  { id: 'crimson', name: 'Dusk Crimson', colors: { background: '#160C0E', surface: '#482329', secondary: '#743B43', border: '#30191D', primary: '#B36A70', text: '#F7E9E7' } },
  { id: 'plum', name: 'Deep Plum', colors: { background: '#130F19', surface: '#392D47', secondary: '#5D496F', border: '#251E30', primary: '#9E83B1', text: '#EEE8F5' } },
];
export const HEX_COLOR = /^#[\da-f]{6}$/i;
export const samePalette = (a: Palette, b: Palette) => COLOR_ROLES.every(({ key }) => a[key].toUpperCase() === b[key].toUpperCase());
export function luminance(hex: string) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function foregroundOn(background: string, preferred?: string) {
  if (preferred && contrast(background, preferred) >= 4.5) return preferred;
  return contrast(background, '#FFFFFF') >= contrast(background, '#000000') ? '#FFFFFF' : '#000000';
}
export const themeStyle = (palette: Palette): CSSProperties => Object.fromEntries(COLOR_ROLES.map(({ key }) => [`--theme-${key}`, palette[key]]));
export function parseThemeState(value: unknown): ThemeState {
  const fallback: ThemeState = { version: 1, activeId: PRESETS[0].id, custom: [], preferences: { ...DEFAULT_APPEARANCE } };
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Record<string, unknown>;
  if (source.version !== 1 || !Array.isArray(source.custom)) return fallback;
  const seen = new Set(PRESETS.map(theme => theme.id));
  const custom: Theme[] = [];
  for (const item of source.custom.slice(0, 100)) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^custom-[\w-]{1,80}$/.test(item.id) || seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || !item.colors || typeof item.colors !== 'object') continue;
    if (!COLOR_ROLES.every(({ key }) => typeof item.colors[key] === 'string' && HEX_COLOR.test(item.colors[key]))) continue;
    seen.add(item.id);
    custom.push({ id: item.id, name: item.name.trim().slice(0, 48), colors: Object.fromEntries(COLOR_ROLES.map(({ key }) => [key, item.colors[key].toUpperCase()])) as Palette });
  }
  return { version: 1, activeId: typeof source.activeId === 'string' && seen.has(source.activeId) ? source.activeId : fallback.activeId, custom, preferences: parseAppearance(source.preferences) };
}
export function loadThemes(): ThemeState {
  try {
    const source = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? 'null');
    const state = parseThemeState(source);
    // Migrate the former Settings controls once, before Settings drops those fields.
    if (!source?.preferences) {
      try { state.preferences = parseAppearance(JSON.parse(localStorage.getItem('tachyon.settings-preview.v1') ?? 'null')?.global); } catch { /* Keep the defaults. */ }
    }
    return state;
  }
  catch { return parseThemeState(null); }
}
