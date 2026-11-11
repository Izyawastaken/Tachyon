import { Box, Coffee, Database, Download, GitBranch, Server, Settings2, Shield, SlidersHorizontal, Sprout, UserRound } from 'lucide-react';
import { CATEGORIES, type CategoryId } from './model';

export const CATEGORY_ICONS = { general: Settings2, java: Coffee, instances: Box, network: Download, storage: Sprout, cache: Database, sharing: GitBranch, servers: Server, accounts: UserRound, privacy: Shield, advanced: SlidersHorizontal };
export const CATEGORY_LABELS: Record<CategoryId, string> = { general: 'General', java: 'Runtime', instances: 'Instances', network: 'Downloads', storage: 'Garden', cache: 'Cache', sharing: 'Sharing', servers: 'Servers', accounts: 'Accounts', privacy: 'Privacy', advanced: 'Advanced' };
export interface SettingsDestination { categoryId: CategoryId; targetId: string }
export interface SettingsNavigation extends SettingsDestination { requestId: number }
export const actionTarget = (title: string) => `settings-action-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const ALIASES: Partial<Record<CategoryId, string[]>> = {
  java: ['JVM', 'JDK', 'RAM', 'Java'], network: ['connections', 'proxy', 'aria2c'], storage: ['storage', 'garden', 'pots', 'dedup', 'integrity'],
  cache: ['cache', 'Engram', 'Decker', 'moka'], sharing: ['git', 'Obscura', 'GitHub', 'share'], accounts: ['Microsoft', 'offline', 'skins'],
};
const ACTIONS: { categoryId: CategoryId; label: string; description: string; keywords: string[]; targetId?: string }[] = [
  { categoryId: 'storage', label: 'Prune unreferenced files', description: 'Preview orphaned files and space to reclaim.', keywords: ['prune', 'dry run', 'orphaned', 'pots', 'garden'] },
  { categoryId: 'storage', label: 'Integrity verification', description: 'Re-verify shared objects against their hashes.', keywords: ['integrity', 'verify', 'reverify', 'hash'] },
  { categoryId: 'cache', label: 'Cache statistics & clear layers', description: 'Hit rate, entries, and separate L1 / L2 clears.', keywords: ['stats', 'hit rate', 'clear', 'L1', 'L2', 'both'], targetId: 'settings-panels-cache' },
  { categoryId: 'cache', label: 'Refresh from remote', description: 'Preview refreshing the Decker snapshot.', keywords: ['snapshot', 'refresh', 'Decker', 'remote'] },
  { categoryId: 'accounts', label: 'Microsoft accounts', description: 'Manage sample profiles and the default account.', keywords: ['Microsoft', 'account', 'add', 'remove'], targetId: 'settings-panels-accounts' },
  { categoryId: 'accounts', label: 'Skin cache', description: 'Preview clearing cached account skins.', keywords: ['skins', 'cache', 'clear'] },
  { categoryId: 'sharing', label: 'GitHub connection & share code', description: 'Link a sample account, copy or regenerate a code.', keywords: ['GitHub', 'OAuth', 'device flow', 'token', 'share code', 'regenerate'], targetId: 'settings-panels-sharing' },
  { categoryId: 'privacy', label: 'Logs folder', description: 'View the sample launcher log location.', keywords: ['open', 'logs', 'folder'] },
  { categoryId: 'privacy', label: 'Redacted debug bundle', description: 'Preview and export synthetic diagnostics.', keywords: ['export', 'diagnostics', 'debug', 'redacted'] },
  { categoryId: 'advanced', label: 'Raw configuration', description: 'Reveal the sample config file location.', keywords: ['raw', 'config', 'toml', 'file'] },
  { categoryId: 'advanced', label: 'Export all settings', description: 'Download local preview preferences.', keywords: ['export', 'settings', 'backup'] },
  { categoryId: 'advanced', label: 'Import settings', description: 'Choose a preview settings file.', keywords: ['import', 'settings', 'json'] },
];

export const SETTINGS_COMMANDS = CATEGORIES.map(category => ({
  ...category,
  commands: [
    ...category.groups.flatMap(group => group.fields.map(field => ({
      id: field.id, label: field.label, description: field.description,
      targetId: `settings-field-${field.id}`,
      keywords: [category.label, group.title, ...(field.options ?? [])],
    }))),
    ...ACTIONS.filter(action => action.categoryId === category.id).map(action => ({
      id: action.targetId ?? actionTarget(action.label), label: action.label, description: action.description,
      targetId: action.targetId ?? actionTarget(action.label), keywords: action.keywords,
    })),
  ],
  keywords: ALIASES[category.id] ?? [],
}));
