import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from '@base-ui/react/popover';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Copy, Expand, Paintbrush, Plus, RotateCcw, Save, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { ShellViewport } from '@/shell/components/ShellViewport';
import { ColorPicker } from './ColorPicker';
import { useAppearanceMotion, useThemes } from './ThemeProvider';
import { COLOR_ROLES, HEX_COLOR, PRESETS, contrast, foregroundOn, samePalette, themeStyle, type ColorRole, type Palette, type Theme } from './model';
import './ThemesPage.css';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 30, mass: .85 };
const QUICK_SPRING = { type: 'spring' as const, stiffness: 480, damping: 28 };
const DRAFT_KEY = 'tachyon.canvas-draft.v1';
interface Draft { sourceId: string; name: string; colors: Palette }
function loadDraft(active: Theme): Draft {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (draft?.version === 1 && typeof draft.sourceId === 'string' && typeof draft.name === 'string' && draft.colors && COLOR_ROLES.every(({ key }) => typeof draft.colors[key] === 'string' && HEX_COLOR.test(draft.colors[key]))) {
      return { sourceId: draft.sourceId, name: draft.name.slice(0, 48), colors: Object.fromEntries(COLOR_ROLES.map(({ key }) => [key, draft.colors[key]])) as Palette };
    }
  } catch { /* A draft is optional when session storage is unavailable. */ }
  return { sourceId: active.id, name: `${active.name} study`, colors: { ...active.colors } };
}

function ColorControl({ role, color, onChange, recent }: { role: typeof COLOR_ROLES[number]; color: string; onChange: (key: ColorRole, color: string) => void; recent: string[] }) {
  const [open, setOpen] = useState(false);
  const actions = useRef<Popover.Root.Actions | null>(null);
  const reduced = useAppearanceMotion();
  return <Popover.Root open={open} actionsRef={actions} onOpenChange={(next, details) => { if (!next) details.preventUnmountOnClose(); setOpen(next); }}>
    <div className="canvas-color-control">
      <Popover.Trigger aria-label={`Edit ${role.label} color`} render={<motion.button
        className="canvas-swatch" type="button" style={{ background: color, color: foregroundOn(color) }}
        whileHover={reduced ? undefined : { y: -6, scale: 1.025, rotate: -.6 }} whileTap={reduced ? undefined : { scale: .95, rotate: 0 }} transition={QUICK_SPRING} />}
      >
        <span className="canvas-swatch-corner"><SlidersHorizontal size={16} /></span>
        <AnimatePresence>{open && <motion.span className="canvas-swatch-selection" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .94 }} transition={QUICK_SPRING} />}</AnimatePresence>
        <span className="canvas-swatch-hex">{color.toUpperCase()}</span>
      </Popover.Trigger>
      <span className="canvas-color-label">{role.label}</span>
      <span className="canvas-color-hint">{role.description}</span>
    </div>
    <Popover.Portal>
      <Popover.Positioner side="bottom" align="center" sideOffset={14} collisionPadding={16} className="canvas-picker-positioner">
        <Popover.Popup aria-label={`${role.label} color picker`} className="canvas-picker-popup" render={<motion.div
          initial={{ opacity: 0, scale: reduced ? 1 : .82, y: reduced ? 0 : -12 }}
          animate={{ opacity: open ? 1 : 0, scale: !open && !reduced ? .9 : 1, y: !open && !reduced ? -8 : 0 }}
          transition={reduced ? { duration: .1 } : SPRING}
          onAnimationComplete={() => { if (!open) actions.current?.unmount(); }} />}
        >
          <div className="canvas-picker-heading"><div><span className="canvas-picker-dot" style={{ background: color }} /><strong>{role.label}</strong></div><Popover.Close aria-label="Close color picker" className="theme-icon-button"><X size={16} /></Popover.Close></div>
          <ColorPicker value={color} onValueChange={value => { if (HEX_COLOR.test(value)) onChange(role.key, value.toUpperCase()); }} allowAlpha={false} recentColors={recent} recentLabel="This palette" className="canvas-picker" />
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}

/** Replace this presentation with the shader renderer when it is supplied. */
function PaletteStudy() {
  return <div className="palette-study" data-shader-slot="true">
    <div className="palette-study-sculpture" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <div className="palette-study-caption"><span className="palette-study-mark" aria-hidden="true">T</span><div><strong>Space for your shader.</strong><span>A live study of your six colors, for now.</span></div></div>
    <div className="palette-study-sample" aria-hidden="true"><span>Made to feel like you.</span><div><i /><i /><i /></div></div>
  </div>;
}

function ExpandedPreview({ colors, onClose }: { colors: Palette; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduced = useAppearanceMotion();
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return createPortal(<motion.dialog ref={dialog} className="canvas-preview-dialog" aria-label="Expanded palette preview"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>('button')?.focus(); } }}
    initial={false} exit={{ opacity: 0 }} transition={{ duration: reduced ? .1 : .4 }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div className="canvas-preview-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
    <motion.section className="canvas-expanded-preview" layoutId={reduced ? undefined : 'canvas-preview'} style={{ ...themeStyle(colors), borderRadius: 28 }} transition={SPRING}>
      <PaletteStudy />
      <motion.div className="canvas-expanded-toolbar" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: .12 }}><span>Palette preview</span><button type="button" autoFocus onClick={onClose}><X size={17} />Close preview</button></motion.div>
    </motion.section>
  </motion.dialog>, document.body);
}

function ThemeCard({ theme, active, onApply, onEdit, onDelete }: { theme: Theme; active: boolean; onApply: () => void; onEdit: () => void; onDelete?: () => void }) {
  const reduced = useAppearanceMotion();
  return <motion.article layout className="theme-card" initial={{ opacity: 0, y: reduced ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .94 }} transition={SPRING}>
    <motion.button type="button" className="theme-card-scene" style={themeStyle(theme.colors)} aria-label={`Use ${theme.name}`} aria-pressed={active} onClick={onApply}
      whileHover={reduced ? undefined : { y: -4 }} whileTap={reduced ? undefined : { scale: .97 }} transition={QUICK_SPRING}>
      <div className="theme-mini-rail"><span /><i /><i /><i /></div><div className="theme-mini-window"><span>Tachyon</span><strong>A space<br />of your own.</strong><div><i /><i /></div><b style={{ color: foregroundOn(theme.colors.primary) }}>Play</b></div>
      {active && <motion.span layoutId="active-theme-check" className="theme-active-check" style={{ background: theme.colors.text, color: theme.colors.background }} transition={SPRING}><Check size={13} /></motion.span>}
    </motion.button>
    <div className="theme-card-meta"><div><h3>{theme.name}</h3><span>{active ? 'Currently applied' : theme.id.startsWith('custom-') ? 'Your creation' : 'Tachyon collection'}</span></div><div className="theme-card-actions"><button className="theme-icon-button" type="button" aria-label={`Edit ${theme.name} in Canvas`} onClick={onEdit}><Paintbrush size={15} /></button>{onDelete && <button className="theme-icon-button" type="button" aria-label={`Delete ${theme.name}`} onClick={onDelete}><Trash2 size={14} /></button>}</div></div>
    <div className="theme-card-colors" aria-hidden="true">{COLOR_ROLES.map(({ key }) => <i key={key} style={{ background: theme.colors[key] }} />)}</div>
  </motion.article>;
}

export default function ThemesPage({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { active, themes, storageError, preferences, updatePreferences, applyTheme, saveTheme, deleteTheme } = useThemes();
  const [tab, setTab] = useState<'themes' | 'canvas'>('themes');
  const [draft, setDraft] = useState(() => loadDraft(active));
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const reduced = useAppearanceMotion();
  const source = themes.find(theme => theme.id === draft.sourceId) ?? PRESETS[0];
  const edited = !samePalette(draft.colors, source.colors);
  const applied = samePalette(draft.colors, active.colors);
  const textContrast = contrast(draft.colors.text, draft.colors.background);
  const surfaceContrast = contrast(draft.colors.text, draft.colors.surface);
  const recent = COLOR_ROLES.map(({ key }) => draft.colors[key]);
  const custom = themes.filter(theme => theme.id.startsWith('custom-'));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...draft })); } catch { /* Editing still works without session storage. */ }
    }, 200);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => () => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...latestDraft.current })); } catch { /* Draft persistence is best effort. */ }
  }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  const changeColor = useCallback((key: ColorRole, color: string) => setDraft(current => ({ ...current, colors: { ...current.colors, [key]: color } })), []);
  const edit = (theme: Theme) => {
    setDraft({ sourceId: theme.id, name: theme.id.startsWith('custom-') ? theme.name : `${theme.name} study`, colors: { ...theme.colors } });
    setTab('canvas');
  };
  const save = (apply: boolean, copy = false) => {
    const name = draft.name.trim();
    if (!name) { setNotice('Give your theme a name before saving.'); return; }
    // Saving an edit to the applied theme must not change the live palette implicitly.
    copy = copy || (!apply && draft.sourceId.startsWith('custom-') && draft.sourceId === active.id && !samePalette(draft.colors, active.colors));
    const id = !copy && draft.sourceId.startsWith('custom-') && themes.some(theme => theme.id === draft.sourceId) ? draft.sourceId : `custom-${crypto.randomUUID()}`;
    if (!saveTheme({ id, name: copy ? `${name.slice(0, 43)} copy` : name, colors: { ...draft.colors } }, apply)) { setNotice('Your library has 100 custom themes. Delete one before saving another.'); return; }
    setDraft(current => ({ ...current, sourceId: id, name: copy ? `${name.slice(0, 43)} copy` : name }));
    setNotice(apply ? `${name} saved and applied.` : `${name} saved to your themes.`);
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ version: 1, name: draft.name.trim() || 'Untitled theme', colors: draft.colors }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${(draft.name.trim() || 'theme').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Theme exported.');
  };

  return <ShellViewport expanded={sidebarOpen}><LayoutGroup id="themes"><div className="themes-page" data-density={preferences.density}>
    <header className="themes-header"><div><h1>Themes</h1><p>Your launcher. Your colors.</p></div><span className="theme-current"><i style={{ background: active.colors.primary }} />{active.name}</span></header>
    <div className="themes-navigation"><div className="themes-tabs" role="tablist" aria-label="Theme workspace">{(['themes', 'canvas'] as const).map(id => <button key={id} id={`theme-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`theme-panel-${id}`} tabIndex={tab === id ? 0 : -1}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'themes' : event.key === 'End' ? 'canvas' : tab === 'themes' ? 'canvas' : 'themes'; setTab(next); document.getElementById(`theme-tab-${next}`)?.focus(); } }}
      onClick={() => setTab(id)}>{tab === id && <motion.span className="theme-tab-indicator" layoutId="theme-tab" transition={SPRING} />}{id === 'themes' ? 'Collection' : 'Canvas'}{id === 'canvas' && <Paintbrush size={14} />}</button>)}</div><AnimatePresence mode="wait"><motion.span key={tab} className="themes-nav-note" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{tab === 'themes' ? 'Find your starting point.' : 'Six colors. Entirely yours.'}</motion.span></AnimatePresence></div>
    <AnimatePresence mode="wait" initial={false}>
      {tab === 'themes' ? <motion.section key="themes" role="tabpanel" id="theme-panel-themes" aria-labelledby="theme-tab-themes" className="themes-collection" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: .2 }}>
        <div className="themes-section-heading"><div><h2>A change of atmosphere.</h2><p>Five starting points. A whole spectrum of possibilities.</p></div><motion.button className="theme-button theme-button-primary" whileTap={{ scale: .96 }} onClick={() => edit(active)}><Plus size={16} />Create a theme</motion.button></div>
        <div className="themes-grid">{PRESETS.map(theme => <ThemeCard key={theme.id} theme={theme} active={active.id === theme.id} onApply={() => { applyTheme(theme.id); setNotice(`${theme.name} applied to Tachyon.`); }} onEdit={() => edit(theme)} />)}</div>
        <div className="themes-section-heading themes-custom-heading"><div><h2>Made by you.</h2><p>{custom.length ? 'Your saved palettes, ready when you are.' : 'Your next favorite theme starts with six colors.'}</p></div>{custom.length > 0 && <span className="themes-count">{custom.length} {custom.length === 1 ? 'theme' : 'themes'}</span>}</div>
        {custom.length ? <div className="themes-grid"><AnimatePresence>{custom.map(theme => <ThemeCard key={theme.id} theme={theme} active={active.id === theme.id} onApply={() => { applyTheme(theme.id); setNotice(`${theme.name} applied to Tachyon.`); }} onEdit={() => edit(theme)} onDelete={() => setDeleteTarget(theme.id)} />)}</AnimatePresence></div> : <button className="themes-empty" type="button" onClick={() => edit(active)}><span className="themes-empty-art" aria-hidden="true"><i /><i /><i /></span><span><strong>Make something that feels like you.</strong><span>Open Canvas and build on a palette you love.</span></span><ArrowUpRight size={21} /></button>}
      </motion.section> : <motion.section key="canvas" role="tabpanel" id="theme-panel-canvas" aria-labelledby="theme-tab-canvas" className="canvas-editor" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: .2 }}>
        <div className="canvas-heading"><div><h2>Make it yours.</h2><p>Pick a color. See everything come together.</p></div><label className="canvas-start-from"><span>Start from</span><select aria-label="Canvas starting theme" value={draft.sourceId} onChange={event => { const theme = themes.find(item => item.id === event.target.value); if (theme) edit(theme); }}>{themes.map(theme => <option value={theme.id} key={theme.id}>{theme.name}</option>)}</select><ChevronDown size={14} /></label></div>
        <motion.div key={resetKey} className="canvas-colors" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : .045 } } }}>{COLOR_ROLES.map(role => <motion.div key={role.key} variants={{ hidden: { opacity: 0, y: reduced ? 0 : 18, scale: reduced ? 1 : .95 }, visible: { opacity: 1, y: 0, scale: 1 } }} transition={SPRING}><ColorControl role={role} color={draft.colors[role.key]} onChange={changeColor} recent={recent} /></motion.div>)}</motion.div>
        <div className="canvas-preview-heading"><span>Palette preview</span><span>Changes stay here until you apply them.</span></div>
        <motion.button ref={previewTrigger} type="button" className="canvas-preview" aria-label="Expand palette preview" layoutId={reduced ? undefined : 'canvas-preview'} style={{ ...themeStyle(draft.colors), borderRadius: 24 } as CSSProperties} onClick={() => setExpanded(true)} transition={SPRING} whileTap={reduced ? undefined : { scale: .99 }}>
          {!expanded && <PaletteStudy />}<span className="canvas-expand-label"><Expand size={15} />Expand preview</span>
        </motion.button>
        <div className="canvas-quality"><span className="canvas-contrast"><span className="canvas-aa" style={{ color: draft.colors.text, background: draft.colors.background }}>Aa</span><span><strong>Text contrast</strong><span>Background {textContrast.toFixed(2)}:1 <span aria-hidden="true">/</span> Surface {surfaceContrast.toFixed(2)}:1</span></span></span><span className={`canvas-contrast-result ${Math.min(textContrast, surfaceContrast) < 4.5 ? 'is-low' : ''}`}>{Math.min(textContrast, surfaceContrast) >= 4.5 ? <><Check size={14} />Text passes AA</> : 'Low text contrast — try a lighter or darker text color.'}</span></div>
        <footer className="canvas-save-bar"><label className="canvas-name"><span>Theme name</span><input aria-label="Theme name" value={draft.name} maxLength={48} placeholder="Give your palette a name" onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><div className="canvas-save-actions"><motion.button whileTap={{ scale: .94 }} type="button" className="theme-icon-button" aria-label="Reset palette" disabled={!edited} onClick={() => { setDraft(current => ({ ...current, colors: { ...source.colors } })); setResetKey(key => key + 1); setNotice('Palette restored to its starting colors.'); }}><RotateCcw size={17} /></motion.button><motion.button whileTap={{ scale: .94 }} type="button" className="theme-icon-button" aria-label="Export theme" onClick={download}><ArrowDownToLine size={17} /></motion.button>{draft.sourceId.startsWith('custom-') && <button className="theme-icon-button" type="button" aria-label="Save as a copy" onClick={() => save(false, true)}><Copy size={17} /></button>}<motion.button whileTap={{ scale: .96 }} className="theme-button" type="button" onClick={() => save(false)}><Save size={15} />Save theme</motion.button><motion.button whileTap={{ scale: .96 }} className="theme-button theme-button-primary" type="button" onClick={() => save(true)}><Check size={16} />{applied ? 'Save & keep applied' : 'Save & apply'}</motion.button></div></footer>
      </motion.section>}
    </AnimatePresence>
    <section className="theme-preferences" aria-labelledby="theme-preferences-heading">
      <div className="themes-section-heading"><div><h2 id="theme-preferences-heading">Comfort &amp; layout</h2><p>A few finishing touches, across your launcher.</p></div></div>
      <div className="theme-preference-row"><div><strong>Reduced motion</strong><p>Keep interactions quiet throughout Tachyon. Your system preference is always respected.</p></div><label className="theme-motion-switch"><input type="checkbox" role="switch" aria-label="Reduced motion" checked={preferences.reducedMotion} onChange={event => updatePreferences({ reducedMotion: event.target.checked })} /><span aria-hidden="true" /></label></div>
      <div className="theme-preference-row"><div><strong>Interface density</strong><p>Choose roomier spacing or fit a little more on screen.</p></div><select aria-label="Interface density" value={preferences.density} onChange={event => updatePreferences({ density: event.target.value as 'Comfortable' | 'Compact' })}><option>Comfortable</option><option>Compact</option></select></div>
      <div className="theme-preference-row"><div><strong>Default sidebar state</strong><p>Start with a compact rail or an expanded sidebar on your next launch.</p></div><select aria-label="Default sidebar state" value={preferences.sidebar} onChange={event => updatePreferences({ sidebar: event.target.value as 'Rail' | 'Expanded' })}><option>Rail</option><option>Expanded</option></select></div>
    </section>
    {storageError && <p className="themes-storage-warning" role="alert">Device storage is unavailable. Changes work for this visit; export your theme to keep a copy.</p>}
    <AnimatePresence>{notice && <motion.div className="themes-toast" role="status" key={notice} initial={{ opacity: 0, y: 24, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={SPRING}><Check size={15} /><span>{notice}</span><button type="button" aria-label="Dismiss theme notification" onClick={() => setNotice('')}><X size={14} /></button></motion.div>}</AnimatePresence>
    <AnimatePresence onExitComplete={() => requestAnimationFrame(() => previewTrigger.current?.focus({ preventScroll: true }))}>{expanded && <ExpandedPreview colors={draft.colors} onClose={() => setExpanded(false)} />}</AnimatePresence>
    {deleteTarget && <DeleteTheme name={themes.find(theme => theme.id === deleteTarget)?.name ?? 'theme'} onCancel={() => setDeleteTarget(null)} onDelete={() => { deleteTheme(deleteTarget); if (draft.sourceId === deleteTarget) setDraft({ sourceId: PRESETS[0].id, name: 'Espresso study', colors: { ...PRESETS[0].colors } }); setDeleteTarget(null); setNotice('Theme deleted.'); }} />}
  </div></LayoutGroup></ShellViewport>;
}

function DeleteTheme({ name, onCancel, onDelete }: { name: string; onCancel: () => void; onDelete: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return createPortal(<dialog ref={dialog} className="theme-delete-dialog" aria-labelledby="delete-theme-title" onCancel={event => { event.preventDefault(); onCancel(); }}><h2 id="delete-theme-title">Delete {name}?</h2><p>This removes the saved theme from this device. If it is applied, Tachyon returns to Espresso.</p><div><button className="theme-button" autoFocus onClick={onCancel}>Keep theme</button><button className="theme-button theme-button-primary" onClick={onDelete}>Delete theme</button></div></dialog>, document.body);
}
