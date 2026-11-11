import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowUpRight, Box, Check, ChevronDown, Coffee, Database, GitBranch, Globe, HardDrive, Info, Link, RotateCcw, Search, Server, Settings2, Shield, Sparkles, Sprout, UserRound, X } from 'lucide-react';
import { ShellViewport } from '@/shell/components/ShellViewport';
import { ActionRow, PreviewDialog, SettingField, SettingsButton, SettingsNote, type PreviewAction } from './components';
import { CATEGORIES, DEFAULTS, INSTANCES, JVM_PRESETS, STORAGE_KEY, loadState, pairedMemoryOverrides, parseState, type Category, type CategoryId, type Setting, type SettingValue } from './model';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { GooeyNav } from './GooeyNav';
import { CATEGORY_ICONS as ICONS, type SettingsNavigation } from './navigation';
import { useThemes } from '@/features/themes/ThemeProvider';
import './SettingsPage.css';

const downloadJson = (filename: string, value: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function SettingsPage({ sidebarOpen, navigationTarget, onOpenSpotlight }: { sidebarOpen: boolean; navigationTarget: SettingsNavigation | null; onOpenSpotlight: (query?: string) => void }) {
  const [state, setState] = useState(loadState);
  const [categoryId, setCategoryId] = useState<CategoryId>(navigationTarget?.categoryId ?? 'general');
  const [scope, setScope] = useState('global');
  const [action, setAction] = useState<PreviewAction | null>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [pruned, setPruned] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cacheCleared, setCacheCleared] = useState({ l1: false, l2: false });
  const [snapshot, setSnapshot] = useState('2026-11-01');
  const [github, setGithub] = useState(false);
  const [token, setToken] = useState('');
  const [shareCodes, setShareCodes] = useState<Record<string, string>>({ vanilla: 'MOSS-7K2P', create: 'FERN-4C8H', hardcore: 'PINE-9S3M' });
  const [accounts, setAccounts] = useState<string[]>(['MeadowPlayer']);
  const [defaultAccount, setDefaultAccount] = useState('MeadowPlayer');
  const [skinsCleared, setSkinsCleared] = useState(false);
  const importer = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const systemReduced = useReducedMotion();
  const jumpTimer = useRef<number | null>(null);
  const highlighted = useRef<HTMLElement | null>(null);
  const revealedRequest = useRef<number | null>(null);
  const active = CATEGORIES.find(category => category.id === categoryId)!;
  const global = state.global;
  const instance = INSTANCES.find(item => item.id === scope);
  const shareCode = shareCodes[scope] ?? 'MOSS-7K2P';
  const effective = { ...global, ...(instance ? state.overrides[scope] : {}) };
  const gameMemory = effective.autoMemory ? 6 : Number(effective.memoryMax);
  const dataVolume = String(global.dataDir).match(/^([a-z]):[\\/]/i)?.[1].toUpperCase();
  const gardenVolume = String(global.gardenPath).match(/^([a-z]):[\\/]/i)?.[1].toUpperCase();
  const sameVolume = Boolean(dataVolume && gardenVolume && dataVolume === gardenVolume);
  const { preferences } = useThemes();
  const overrideCount = Object.keys(state.overrides[scope] ?? {}).length;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);
  const reduced = systemReduced || preferences.reducedMotion;
  useEffect(() => {
    if (navigationTarget) setCategoryId(navigationTarget.categoryId);
  }, [navigationTarget]);
  useEffect(() => {
    const frame = requestAnimationFrame(revealTarget);
    return () => cancelAnimationFrame(frame);
  }, [navigationTarget, categoryId]);
  useEffect(() => () => {
    if (jumpTimer.current !== null) clearTimeout(jumpTimer.current);
    highlighted.current?.classList.remove('is-spotlit');
  }, []);

  function revealTarget() {
    if (!navigationTarget || navigationTarget.categoryId !== categoryId || revealedRequest.current === navigationTarget.requestId) return;
    const element = scroll.current?.querySelector<HTMLElement>(`#${CSS.escape(navigationTarget.targetId)}`);
    if (!element) return;
    revealedRequest.current = navigationTarget.requestId;
    if (jumpTimer.current !== null) clearTimeout(jumpTimer.current);
    highlighted.current?.classList.remove('is-spotlit');
    highlighted.current = element;
    element.classList.add('is-spotlit');
    element.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
    const control = element.classList.contains('settings-field')
      ? element.querySelector<HTMLElement>('.settings-field-control :is(input, select, textarea, button):not([disabled])')
      : element.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    (control ?? element).focus({ preventScroll: true });
    jumpTimer.current = window.setTimeout(() => element.classList.remove('is-spotlit'), 3500);
  }
  function navigate(id: CategoryId) {
    highlighted.current?.classList.remove('is-spotlit');
    setCategoryId(id);
    scroll.current?.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
  }
  function notify(message: string) { setNotice(message); }
  function setValue(field: Setting, value: SettingValue) {
    // Retention reductions always get a consequence preview before they are applied.
    if (field.id === 'retention') {
      const days = (v: SettingValue) => v === 'Forever' ? Infinity : parseInt(String(v), 10);
      if (days(value) < days(effective.retention)) {
        setAction({ title: 'Shorten rollback history?', description: `Keep ${String(value).toLowerCase()} of snapshots for ${instance?.name ?? 'the global default'}. Existing instance overrides stay unchanged.`, items: [{ label: 'Sample history outside this window', value: '18 snapshots · 420 MB' }, { label: 'World files and current pack', value: 'Kept' }], confirm: 'Apply preview retention', danger: true, onConfirm: () => { applyValue(field, value); notify('Preview retention updated. No Git history was removed.'); } }); return;
      }
    }
    applyValue(field, value);
  }
  function applyValue(field: Setting, value: SettingValue) {
    setState(current => {
      const perInstance = Boolean(instance && field.instance);
      const currentValues = { ...current.global, ...(perInstance ? current.overrides[scope] : {}) };
      const changes = { [field.id]: value };
      if (field.id === 'dataDir' && current.global.gardenPath === `${String(current.global.dataDir)}\\garden`) changes.gardenPath = `${String(value).replace(/[\\/]+$/, '')}\\garden`;
      if (field.id === 'jvmPreset' && JVM_PRESETS[String(value)]) changes.jvmArgs = JVM_PRESETS[String(value)];
      if (field.id === 'jvmArgs') changes.jvmPreset = 'Custom';
      if (field.id === 'memoryMin' && Number(value) > Number(currentValues.memoryMax)) changes.memoryMax = value;
      if (field.id === 'memoryMax' && Number(value) < Number(currentValues.memoryMin)) changes.memoryMin = value;
      if (field.id === 'portStart' && Number(value) > Number(currentValues.portEnd)) changes.portEnd = value;
      if (field.id === 'portEnd' && Number(value) < Number(currentValues.portStart)) changes.portStart = value;
      if (perInstance) return { ...current, overrides: { ...current.overrides, [scope]: pairedMemoryOverrides(current.global, { ...current.overrides[scope], ...changes }) } };
      const nextGlobal = { ...current.global, ...changes };
      return { ...current, global: nextGlobal };
    });
  }
  function resetField(field: Setting) {
    setState(current => {
      const overrides = { ...current.overrides[scope] }; delete overrides[field.id];
      if (field.id === 'jvmPreset') delete overrides.jvmArgs;
      if (field.id === 'jvmArgs') delete overrides.jvmPreset;
      if (field.id === 'memoryMin' || field.id === 'memoryMax') { delete overrides.memoryMin; delete overrides.memoryMax; }
      return { ...current, overrides: { ...current.overrides, [scope]: overrides } };
    });
  }
  function resetSection(category: Category) {
    const fields = category.groups.flatMap(group => group.fields);
    setAction({ title: `Reset ${category.label.toLowerCase()}?`, description: instance ? `Remove this section’s overrides for ${instance.name}. Launcher-wide preferences in this section are unchanged.` : 'Restore this section’s global defaults. Other sections and instance overrides are kept.', items: [{ label: 'Scope', value: instance?.name ?? 'Global defaults' }, { label: 'Settings affected', value: String(fields.filter(field => !instance || field.instance).length) }], confirm: 'Reset section', danger: true, onConfirm: () => {
      setState(current => {
        if (instance) {
          const overrides = { ...current.overrides[scope] }; fields.forEach(field => { if (field.instance) delete overrides[field.id]; });
          return { ...current, overrides: { ...current.overrides, [scope]: overrides } };
        }
        const next = { ...current.global }; fields.forEach(field => { next[field.id] = DEFAULTS[field.id]; });
        if (category.id === 'general' && current.global.gardenPath === `${String(current.global.dataDir)}\\garden`) next.gardenPath = DEFAULTS.gardenPath;
        return { ...current, global: next };
      }); notify(`${category.label} preview settings reset.`);
    } });
  }
  function clearCache(which: 'l1' | 'l2' | 'both') {
    const l1 = which !== 'l2' && !cacheCleared.l1, l2 = which !== 'l1' && !cacheCleared.l2;
    setAction({ title: `Clear ${which === 'both' ? 'both cache layers' : which.toUpperCase()}?`, description: 'Cached responses will be fetched again on the next visit. Your instances, worlds, and bundled snapshot are kept.', items: [{ label: 'Memory released', value: l1 ? '42 MB · 1,284 entries' : '0 MB' }, { label: 'Disk space freed', value: l2 ? '386 MB · 18,420 entries' : '0 MB' }], confirm: 'Clear preview cache', danger: true, onConfirm: () => { setCacheCleared(current => ({ l1: current.l1 || which !== 'l2', l2: current.l2 || which !== 'l1' })); notify('Sample cache cleared. No application cache was deleted.'); } });
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(shareCode); notify('Sample share code copied.'); }
    catch { setAction({ title: 'Copy sample share code', description: 'Clipboard access is unavailable. Select and copy this code instead.', items: [{ label: 'Share code', value: shareCode }] }); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('Choose a settings file smaller than 1 MB.');
      const imported = parseState(JSON.parse(await file.text()));
      setAction({ title: 'Import preview settings?', description: 'Replace your local preview preferences with the values in this file. No game or launcher configuration files are changed.', items: [{ label: 'File', value: file.name }, { label: 'Instance profiles', value: String(Object.keys(imported.overrides).length) }], confirm: 'Import settings', onConfirm: () => { setState(imported); notify('Preview settings imported.'); } });
    } catch (error) { notify(error instanceof SyntaxError ? 'That file is not valid JSON. Choose a Tachyon settings export.' : error instanceof Error ? error.message : 'Could not read that settings file.'); }
  }
  function specialPanels(category: Category) {
    switch (category.id) {
      case 'general': return <>
      <div className="settings-paths"><span><Box size={14} /><b>Instances</b><code>{String(global.dataDir)}\instances</code></span><span><Sprout size={14} /><b>Shared store</b><code>{String(global.gardenPath)}</code></span><span><Database size={14} /><b>Caches</b><code>{String(global.dataDir)}\cache</code></span></div>
        <SettingsNote icon={<HardDrive size={17} />}><strong>{sameVolume ? 'Same drive. Less duplication.' : 'Check your shared store location.'}</strong><p>{sameVolume ? 'Instance and shared store paths are on the same drive.' : 'Hardlinks require instances and the shared store on the same filesystem. These paths need a compatibility check.'} Sample detection: NTFS on C:. Other drives are unverified. Moving data is a preview preference; existing files stay where they are.</p></SettingsNote>
      </>;
      case 'java': return <div className="settings-detection"><div><Coffee size={22} /><span><strong>Java, taken care of.</strong><small>Sample detection · no device scan</small></span><span className="settings-chip">Auto-managed</span></div><dl><div><dt>Minecraft 1.20.5+</dt><dd>Java 21 · Temurin</dd></div><div><dt>Minecraft 1.18–1.20.4</dt><dd>Java 17 · Temurin</dd></div><div><dt>Older versions</dt><dd>Java 8 / 16 as needed</dd></div></dl><div className="settings-memory-preview"><div><span>Sample device memory</span><strong>16 <small>GB</small></strong></div><div className="settings-memory-bar" aria-label={`Sample memory: ${gameMemory} GB game, ${16 - gameMemory} GB available`}><span style={{ width: `${gameMemory / 16 * 100}%` }} /></div><span><i />{gameMemory} GB for Minecraft<span>{16 - gameMemory} GB left for your system</span></span></div></div>;
      case 'instances': return <SettingsNote icon={<Link size={17} />}><strong>{instance ? `${overrideCount} overrides in ${instance.name}` : 'One set of defaults. Room for exceptions.'}</strong><p>Use the scope picker above to select an instance. Edit any game setting to override it; reset it with one click to inherit the global value again.</p></SettingsNote>;
      case 'network': return null;
      case 'storage': return <>
        <div className="settings-detection"><div><HardDrive size={21} /><span><strong>NTFS · Local disk (C:)</strong><small>Sample filesystem capabilities</small></span></div><div className="settings-capabilities"><span><Check size={13} /> Hardlinks available</span><span><X size={13} /> Reflinks unavailable</span><span><Check size={13} /> Copy fallback</span></div>{global.dedup === 'Hardlink' && !sameVolume && <SettingsNote icon={<Info size={16} />}><p>{global.copyFallback ? 'These locations cannot be confirmed to share a filesystem. Installation would use copies until verified.' : 'Hardlinks need a shared filesystem. Without copy fallback, installation would stop if these paths are incompatible.'}</p></SettingsNote>}{global.dedup === 'Reflink' && <SettingsNote icon={<Info size={16} />}><p>{global.copyFallback ? 'Reflinks are unavailable in this sample. Files would fall back to copies.' : 'Reflinks are unavailable and copy fallback is off. Installation would stop.'}</p></SettingsNote>}</div>
        <section className="settings-panel"><div className="settings-panel-title"><div><h3>A healthier garden</h3><p>Sample storage across 8 pots.</p></div><Sprout size={24} /></div><div className="settings-stats"><div><strong>12.8 <small>GB</small></strong><span>space saved</span></div><div><strong>64<small>%</small></strong><span>less than naive copies</span></div><div><strong>{pruned ? '0' : '12'}</strong><span>orphaned references</span></div></div><div className="settings-storage-bar"><span /></div><div className="settings-storage-legend"><span>7.2 GB on disk</span><span>20 GB as separate copies</span></div>
          <ActionRow title="Prune unreferenced files" description={pruned ? 'Your sample garden is tidy. No unreferenced files remain.' : '12 orphaned references · 248 MB could be reclaimed.'} action="Dry-run preview" onClick={() => setAction({ title: 'Prune unreferenced files', description: 'Only shared objects with no remaining pot references are eligible. Referenced game files and saves are kept.', items: [{ label: 'Orphaned pot references', value: pruned ? '0' : '12' }, { label: 'Unreferenced objects', value: pruned ? '0' : '36 files' }, { label: 'Space to reclaim', value: pruned ? '0 MB' : '248 MB' }, { label: 'Referenced objects and worlds', value: 'Kept' }], confirm: pruned ? undefined : 'Prune sample files', danger: true, onConfirm: () => { setPruned(true); notify('Sample garden pruned. No files were deleted.'); } })} />
          <ActionRow title="Integrity verification" description={verified ? 'Sample scan complete · 2,416 objects verified · no mismatches.' : 'Re-check shared objects against their expected content hashes.'} action={verified ? 'Verify again' : 'Re-verify integrity'} onClick={() => setAction({ title: 'Verify garden integrity', description: 'Preview a hash scan of the shared store. This will not alter game files.', items: [{ label: 'Objects to verify', value: '2,416' }, { label: 'Sample size', value: '7.2 GB' }], confirm: 'Run sample scan', onConfirm: () => { setVerified(true); notify('Sample scan complete: all 2,416 objects verified.'); } })} />
        </section>
      </>;
      case 'cache': return <>
        <section className="settings-panel"><div className="settings-panel-title"><div><h3>Every hit is a little less waiting.</h3><p>Sample cache activity · this session</p></div><Activity size={23} /></div><div className="settings-stats"><div><strong>{cacheCleared.l1 && cacheCleared.l2 ? '—' : '94.2'}<small>{cacheCleared.l1 && cacheCleared.l2 ? '' : '%'}</small></strong><span>cache hit rate</span></div><div><strong>{(cacheCleared.l1 ? 0 : 42) + (cacheCleared.l2 ? 0 : 386)} <small>MB</small></strong><span>total cache size</span></div><div><strong>{((cacheCleared.l1 ? 0 : 1284) + (cacheCleared.l2 ? 0 : 18420)).toLocaleString()}</strong><span>cached entries</span></div></div><div className="settings-cache-layers"><span><i />L1 · {cacheCleared.l1 ? '0' : '42'} MB / {String(global.l1Cap)} MB</span><span><i />L2 · {cacheCleared.l2 ? '0' : '386'} MB / {String(global.l2Cap)} MB</span></div><div className="settings-button-group"><SettingsButton onClick={() => clearCache('l1')}>Clear L1</SettingsButton><SettingsButton onClick={() => clearCache('l2')}>Clear L2</SettingsButton><SettingsButton onClick={() => clearCache('both')}>Clear both</SettingsButton></div></section>
        <section className="settings-panel"><div className="settings-panel-title"><div><h3>Decker, ready offline.</h3><p>Sample bundled snapshot · {snapshot} · 82,416 projects</p></div><Database size={23} /></div><ActionRow title="Refresh from remote" description={global.deckerRemote ? 'Remote refresh is opted in. Preview replacing the snapshot.' : 'Enable “Allow remote snapshot refresh” above to opt in.'} action="Preview refresh" disabled={!global.deckerRemote} onClick={() => setAction({ title: 'Refresh Decker snapshot?', description: 'Preview replacing the offline catalog with a newer remote snapshot. The mock refresh makes no network request.', items: [{ label: 'Current snapshot', value: snapshot }, { label: 'Sample remote snapshot', value: '2026-11-11' }, { label: 'Download / replacement size', value: '18 MB / 64 MB' }], confirm: 'Simulate refresh', onConfirm: () => { setSnapshot('2026-11-11'); notify('Sample snapshot refreshed.'); } })} />{global.wal === 'Manual' && <ActionRow title="WAL checkpoint" description="Preview folding 3.2 MB of pending writes into the cache database." action="Preview checkpoint" onClick={() => setAction({ title: 'Checkpoint cache database', description: 'Preview merging pending writes. Cached entries are kept.', items: [{ label: 'Write-ahead log', value: '3.2 MB' }], confirm: 'Simulate checkpoint', onConfirm: () => notify('Sample WAL checkpoint complete.') })} />}</section>
      </>;
      case 'sharing': return <>
        <section className="settings-panel"><div className="settings-account"><span className="settings-avatar"><GitBranch size={23} /></span><div><strong>{github ? 'Tachyon Gardener' : 'Connect your GitHub'}</strong><p>{github ? 'Sample account · @tachyon-gardener' : 'Keep pack history and invite people into your world.'}</p></div><SettingsButton onClick={() => github ? setAction({ title: 'Disconnect sample GitHub account?', description: 'Your preview repositories and snapshot preferences are kept.', confirm: 'Disconnect', onConfirm: () => { setGithub(false); notify('Sample GitHub account disconnected.'); } }) : setAction({ title: global.githubMethod === 'Token' ? 'Connect with a sample token' : 'Link GitHub · device flow', description: global.githubMethod === 'Token' ? 'This field is a mock. No token is sent, exported, or persisted.' : 'In the full launcher, you would enter this code on GitHub to authorize Tachyon. This preview does not open an OAuth flow.', items: global.githubMethod === 'Token' ? [{ label: 'Connection', value: token ? 'Sample token entered' : 'No token entered' }] : [{ label: 'Sample device code', value: 'TXYN-MOCK' }, { label: 'Permissions', value: 'Repository access for shared packs' }], confirm: 'Simulate connection', onConfirm: () => { setGithub(true); setToken(''); notify('Sample GitHub account connected.'); } })}>{github ? 'Disconnect' : 'Link account'}<ArrowUpRight size={13} /></SettingsButton></div>{!github && global.githubMethod === 'Token' && <label className="settings-token">Sample token<input type="password" autoComplete="off" placeholder="Mock token only" value={token} onChange={event => setToken(event.target.value)} /></label>}</section>
        <section className="settings-panel"><div className="settings-panel-title"><div><h3>A small code. A shared world.</h3><p>{instance ? instance.name : 'Select an instance to manage its share code.'} · Sample code</p></div><Link size={23} /></div><div className="settings-share-code"><code>{shareCode}</code><SettingsButton disabled={!instance} onClick={() => void copyCode()}>Copy code</SettingsButton><SettingsButton disabled={!instance} onClick={() => setAction({ title: 'Regenerate share code?', description: 'The old sample code stops working. Anyone with it would need your new code.', items: [{ label: 'Old code', value: shareCode }, { label: 'Access granted', value: String(effective.shareRights) }], confirm: 'Regenerate sample code', danger: true, onConfirm: () => { setShareCodes(current => ({ ...current, [scope]: `MOSS-${crypto.randomUUID().slice(0, 4).toUpperCase()}` })); notify('Sample share code regenerated.'); } })}>Regenerate</SettingsButton></div><SettingsNote icon={<Shield size={16} />}><p>{effective.shareRights === 'Read-only' ? 'Read-only: recipients can view and install the pack. They cannot change it.' : 'PR rights: recipients can propose changes. Merge behavior follows the approval setting above.'}</p></SettingsNote></section>
      </>;
      case 'servers': return <SettingsNote icon={<Server size={18} />}><strong>Docker Desktop · sample detection</strong><p>Local named pipe · Engine 27.3 · 8 CPUs / 16 GB available. The preview does not connect to Docker or create containers.</p></SettingsNote>;
      case 'accounts': return <section className="settings-panel"><div className="settings-panel-title"><div><h3>Microsoft accounts</h3><p>Sample profiles only · no real authentication</p></div><UserRound size={22} /></div>{accounts.map(account => <div className="settings-account" key={account}><span className="settings-avatar">{account.slice(0, 1)}</span><div><strong>{account}</strong><p>{defaultAccount === account ? 'Default account · sample verified profile' : 'Sample verified profile'}</p></div>{defaultAccount !== account && <SettingsButton label={`Make ${account} default`} onClick={() => { setDefaultAccount(account); notify('Default sample account updated.'); }}>Make default</SettingsButton>}<button className="settings-icon-button" type="button" aria-label={`Remove ${account}`} onClick={() => setAction({ title: `Remove ${account}?`, description: 'Remove this sample profile from the preview. No Microsoft account or game entitlement is changed.', confirm: 'Remove sample account', danger: true, onConfirm: () => { setAccounts(current => current.filter(item => item !== account)); if (defaultAccount === account) setDefaultAccount(accounts.find(item => item !== account) ?? ''); notify('Sample account removed.'); } })}><X size={15} /></button></div>)}<ActionRow title="Add a Microsoft account" description="Preview a second profile without signing in." action="Add sample account" disabled={accounts.includes('MossExplorer')} onClick={() => { setAccounts(current => [...current, 'MossExplorer']); if (!defaultAccount) setDefaultAccount('MossExplorer'); notify('Sample Microsoft profile added.'); }} /><ActionRow title="Skin cache" description={skinsCleared ? 'No sample skins cached.' : '24 cached skins · 3.6 MB · available offline.'} action="Preview clear" onClick={() => setAction({ title: 'Clear cached skins?', description: 'Skins would download again when the account is online. Your saved skins and profiles are kept.', items: [{ label: 'Space to free', value: skinsCleared ? '0 MB' : '3.6 MB' }], confirm: 'Clear sample skins', danger: true, onConfirm: () => { setSkinsCleared(true); notify('Sample skin cache cleared.'); } })} /></section>;
      case 'privacy': return <section className="settings-panel"><ActionRow title="Logs folder" description="Preview where launcher logs are stored." action="Open logs folder" onClick={() => setAction({ title: 'Logs folder', description: 'The full launcher would reveal this folder in your file manager.', items: [{ label: 'Sample location', value: `${String(global.dataDir)}\\logs` }] })} /><ActionRow title="Redacted debug bundle" description="Review the contents before exporting a sample support bundle." action="Preview export" onClick={() => setAction({ title: 'Export a redacted debug bundle', description: 'Create a small JSON file with synthetic diagnostics. Account identifiers, tokens, user paths, environment variables, and hooks are excluded.', items: [{ label: 'Included', value: 'Sample launcher status, log level, storage health' }, { label: 'Excluded', value: 'Personal data, credentials, real logs, game files' }, { label: 'Contents', value: 'Synthetic preview data only' }], confirm: 'Export sample bundle', onConfirm: () => { downloadJson('tachyon-debug-preview.json', { preview: true, launcher: 'Tachyon', diagnostics: { logLevel: global.logLevel, filesystem: 'Sample NTFS', integrity: verified ? 'Sample verified' : 'Not scanned', orphanedReferences: pruned ? 0 : 12 }, logs: ['[INFO] Synthetic settings preview started.'], redacted: ['account identifiers', 'tokens', 'user paths', 'environment variables', 'hooks'] }); notify('Sample debug bundle exported.'); } })} /></section>;
      case 'advanced': return <section className="settings-panel"><ActionRow title="Raw configuration" description="Preview the config file location for the full launcher." action="Reveal in file manager" onClick={() => setAction({ title: 'Raw configuration file', description: 'The full launcher would reveal this file in your file manager. This UI preview saves preferences separately in local browser storage.', items: [{ label: 'Sample file location', value: `${String(global.dataDir)}\\config.toml` }] })} /><ActionRow title="Export all settings" description="Download your prototype preferences and instance overrides as JSON. Review custom paths and commands before sharing." action="Export settings" onClick={() => { downloadJson('tachyon-settings-preview.json', state); notify('Preview settings exported.'); }} /><ActionRow title="Import settings" description="Preview a settings export before replacing local preferences." action="Choose file" onClick={() => importer.current?.click()} /><SettingsNote icon={<RotateCcw size={16} />}><p>Each section has its own reset button. In an instance scope, resetting removes that section’s overrides and restores inheritance.</p></SettingsNote></section>;
    }
  }

  return <ShellViewport expanded={sidebarOpen} scrollable={false}><div className="settings-page" data-density={preferences.density} data-reduced-motion={preferences.reducedMotion}>
    <header className="settings-header"><div className="settings-title"><span className="settings-title-icon"><Settings2 size={22} strokeWidth={1.5} /></span><div><h1>Settings</h1><p>A little fine-tuning. Your kind of launcher.</p></div></div><div className="settings-header-actions"><span className="settings-preview-label"><span />Interactive preview</span><button type="button" className="settings-spotlight-trigger" aria-label="Find a setting" onClick={() => onOpenSpotlight('. ')}><Search size={15} /><span>Find a setting</span><kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌥ Space' : 'Ctrl Space'}</kbd></button></div></header>
    <GooeyNav active={categoryId} onSelect={navigate} reducedMotion={preferences.reducedMotion} />
    <div className="settings-layout">
    <div className="settings-workspace"><div className="settings-scope"><div><Globe size={15} /><span>Editing</span></div><div className="settings-select"><select aria-label="Settings scope" value={scope} onChange={event => setScope(event.target.value)}><option value="global">Global defaults</option>{INSTANCES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={13} /></div><span className="settings-scope-hint">{instance ? `${overrideCount} overrides` : 'Applies to every instance'}</span></div>
      <div className="settings-scroll" ref={scroll}><AnimatePresence mode="wait" initial={false}>
      {[active].map(category => {
        const Icon = ICONS[category.id];
        return <motion.section className="settings-category" key={category.id} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: reduced ? .08 : .2, ease: [.2, .8, .2, 1] }} onAnimationComplete={revealTarget} aria-labelledby={`settings-category-${category.id}`}><div className="settings-category-heading"><div><span className="settings-eyebrow"><Icon size={13} />{instance ? 'INSTANCE PREFERENCES' : 'LAUNCHER PREFERENCES'}</span><h2 id={`settings-category-${category.id}`} tabIndex={-1}>{category.label}</h2><p>{category.description}</p></div><button type="button" className="settings-section-reset" aria-label={`Reset ${category.label} section`} title="Reset this section" onClick={() => resetSection(category)}><RotateCcw size={14} /><span>Reset section</span></button></div>
          {instance && !category.groups.some(group => group.fields.some(field => field.instance)) && <SettingsNote icon={<Globe size={15} />}><p>These preferences apply to the launcher. Game settings in Java, Instances, and Sharing can be overridden per instance.</p></SettingsNote>}
          {category.groups.map(group => {
            const fields = group.fields;
            if (!fields.length) return null;
            return <section className="settings-group" key={group.title} aria-label={group.title}><div className="settings-group-heading"><h3>{group.title}</h3>{group.description && <p>{group.description}</p>}</div><div className="settings-fields">{fields.map(field => {
              const values = field.instance ? effective : global;
              const disabled = Boolean(field.when && values[field.when[0]] !== field.when[1]) || (field.id === 'proxyHost' && global.proxyType === 'None');
              return <SettingField key={field.id} field={field} value={values[field.id]} onChange={value => setValue(field, value)} instance={Boolean(instance)} overridden={Boolean(instance && Object.prototype.hasOwnProperty.call(state.overrides[scope] ?? {}, field.id))} onReset={() => resetField(field)} disabled={disabled} />;
            })}</div></section>;
          })}
          <div id={`settings-panels-${category.id}`} tabIndex={-1}>{specialPanels(category)}</div>
          {category.id === 'general' && global.channel === 'Nightly' && <SettingsNote icon={<Sparkles size={16} />}><p>Nightly builds can introduce breaking changes. Your selected channel is a preview preference.</p></SettingsNote>}
          {category.id === 'network' && global.hash === 'Disabled' && <SettingsNote icon={<Shield size={16} />}><p>With verification disabled, corrupt or modified downloads would not be rejected by a hash check.</p></SettingsNote>}
        </motion.section>;
      })}</AnimatePresence>
      </div><footer className="settings-footer"><span><Check size={13} />{storageError ? 'Preview changes last for this visit only' : 'Preview preferences saved on this device'}</span><span>Sample data · no system changes</span></footer>
    </div></div>
    <input className="sr-only" tabIndex={-1} type="file" ref={importer} aria-label="Import settings file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
    {notice && <div className="settings-toast" role="status"><Check size={15} /><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={13} /></button></div>}
    {action && <PreviewDialog action={action} onClose={() => setAction(null)} />}
  </div></ShellViewport>;
}
