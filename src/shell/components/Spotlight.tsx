import { useEffect, useRef, useState } from 'react';
import { Command, defaultFilter } from 'cmdk';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, CornerDownLeft, House, Compass, Library, Camera, Palette, Search, Settings2, X } from 'lucide-react';
import { CATEGORY_ICONS, SETTINGS_COMMANDS, type SettingsDestination } from '@/features/settings/navigation';
import { useThemes } from '@/features/themes/ThemeProvider';
import './Spotlight.css';

export type SpotlightSelection = { kind: 'settings'; destination: SettingsDestination } | { kind: 'route'; route: string };
const ROUTES = [
  { id: 'home', label: 'Home', description: 'Back to your launcher.', icon: House },
  { id: 'explore', label: 'Explore', description: 'Find your next addition.', icon: Compass },
  { id: 'library', label: 'Library', description: 'All your little universes.', icon: Library },
  { id: 'skins', label: 'Skins', description: 'A different look for your next adventure.', icon: Palette },
  { id: 'themes', label: 'Themes', description: 'Canvas, colors, motion, and layout preferences.', icon: Palette },
  { id: 'screenshots', label: 'Screenshots', description: 'Moments worth keeping.', icon: Camera },
];
export default function Spotlight({ open, initialSearch, onOpenChange, onSelect }: {
  open: boolean; initialSearch: string; onOpenChange: (open: boolean) => void; onSelect: (selection: SpotlightSelection) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<SpotlightSelection | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState(initialSearch);
  const { preferences } = useThemes();
  const systemReduced = useReducedMotion();
  const reduced = systemReduced || preferences.reducedMotion;
  const settingsMode = query.trimStart().startsWith('.');

  useEffect(() => {
    if (!open) return;
    pending.current = null;
    setQuery(initialSearch);
    if (!dialog.current?.open) {
      origin.current = document.activeElement as HTMLElement | null;
      dialog.current?.showModal();
    }
    const frame = requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(initialSearch.length, initialSearch.length); });
    return () => cancelAnimationFrame(frame);
  }, [open, initialSearch]);

  function choose(selection: SpotlightSelection) { pending.current = selection; onOpenChange(false); }
  function finishClose() {
    dialog.current?.close();
    const selection = pending.current; pending.current = null;
    if (selection) onSelect(selection);
    else origin.current?.focus({ preventScroll: true });
  }

  return <dialog ref={dialog} className="spotlight-dialog" data-state={open ? 'open' : 'closing'} data-reduced-motion={Boolean(reduced)} aria-labelledby="spotlight-title" aria-describedby="spotlight-help" onCancel={event => { event.preventDefault(); onOpenChange(false); }} onClick={event => { if (event.target === event.currentTarget) onOpenChange(false); }}>
    <AnimatePresence onExitComplete={finishClose}>
      {open && <motion.div key="spotlight" className="spotlight-panel" initial={{ opacity: 0, y: reduced ? 0 : 90, scale: reduced ? 1 : .75 }} animate={{ opacity: 1, y: 0, scale: 1, transition: reduced ? { duration: .1 } : { type: 'spring', stiffness: 350, damping: 28, mass: .85 } }} exit={{ opacity: 0, y: reduced ? 0 : 45, scale: reduced ? 1 : .9, transition: { duration: reduced ? .08 : .18, ease: [.4, 0, 1, 1] } }}>
        <h2 id="spotlight-title" className="sr-only">Tachyon Spotlight</h2>
        <Command label="Spotlight search" loop filter={(value, search, keywords) => {
          const score = defaultFilter(value, settingsMode ? search.trimStart().replace(/^\.\s*/, '') : search, keywords);
          // Suppress near-zero subsequence matches across long descriptions.
          return score >= .05 ? score : 0;
        }}>
          <div className="spotlight-input-row"><span className={`spotlight-mode${settingsMode ? ' is-settings' : ''}`} aria-hidden="true">{settingsMode ? <span>.</span> : <Search size={21} strokeWidth={1.6} />}</span><Command.Input ref={input} aria-label="Spotlight search" placeholder="Where would you like to go?" value={query} onValueChange={setQuery} spellCheck={false} autoComplete="off" autoCorrect="off" /><button type="button" className="spotlight-close" aria-label="Close Spotlight" onClick={() => onOpenChange(false)}><X size={16} /><kbd>esc</kbd></button></div>
          <div className="spotlight-context"><span>{settingsMode ? 'SETTINGS' : 'QUICK JUMP'}</span><span>{settingsMode ? 'Find a preference. Make it yours.' : <>Type <kbd>.</kbd> to search settings</>}</span></div>
          <Command.List label="Spotlight results">
            <Command.Empty><Search size={25} strokeWidth={1.4} /><strong>{settingsMode ? 'No matching settings.' : 'Looking for a setting?'}</strong><p>{settingsMode ? 'Try . JVM, . memory, . cache, or . prune.' : <>Start with a dot: <b>. {query.trim() || 'JVM'}</b></>}</p>{!settingsMode && <button type="button" onClick={() => { setQuery(`. ${query.trim()}`); input.current?.focus(); }}>Search settings<ArrowRight size={13} /></button>}</Command.Empty>
            {settingsMode ? <>
              {SETTINGS_COMMANDS.map(category => {
                const Icon = CATEGORY_ICONS[category.id];
                return <Command.Group key={category.id} heading={category.label}>{category.commands.map(command => <Command.Item key={command.id} aria-label={command.label} value={`${category.id}:${command.id}`} keywords={[command.label, command.description, ...command.keywords]} onSelect={() => choose({ kind: 'settings', destination: { categoryId: category.id, targetId: command.targetId } })}><span className="spotlight-result-icon"><Icon size={17} strokeWidth={1.6} /></span><span className="spotlight-result-copy"><strong>{command.label}</strong><small>{command.description}</small></span><span className="spotlight-result-trail"><span>{category.label}</span><CornerDownLeft size={14} /></span></Command.Item>)}</Command.Group>;
              })}
              <Command.Group heading="Sections">{SETTINGS_COMMANDS.map(category => <Command.Item key={category.id} aria-label={`Open ${category.label} section`} value={`category:${category.id}`} keywords={[category.label, ...category.keywords]} onSelect={() => choose({ kind: 'settings', destination: { categoryId: category.id, targetId: `settings-category-${category.id}` } })}><span className="spotlight-result-icon"><Settings2 size={17} /></span><span className="spotlight-result-copy"><strong>{category.label}</strong><small>Open all preferences in this section.</small></span><ArrowRight size={15} /></Command.Item>)}</Command.Group>
            </> : <Command.Group heading="Go to">{ROUTES.map(route => <Command.Item key={route.id} value={route.label} onSelect={() => choose({ kind: 'route', route: route.id })}><span className="spotlight-result-icon"><route.icon size={17} strokeWidth={1.6} /></span><span className="spotlight-result-copy"><strong>{route.label}</strong><small>{route.description}</small></span><ArrowRight size={15} /></Command.Item>)}<Command.Item value="Search settings" keywords={['preferences', 'config', '.']} onSelect={() => { setQuery('. '); input.current?.focus(); }}><span className="spotlight-result-icon">.</span><span className="spotlight-result-copy"><strong>Search settings</strong><small>A dot, then anything you want to fine-tune.</small></span><kbd>.</kbd></Command.Item></Command.Group>}
          </Command.List>
          <footer className="spotlight-footer" id="spotlight-help"><span><kbd><ArrowUp size={10} /></kbd><kbd><ArrowDown size={10} /></kbd>navigate</span><span><kbd><CornerDownLeft size={11} /></kbd>{settingsMode ? 'reveal setting' : 'open'}</span><span><kbd>esc</kbd>close</span></footer>
        </Command>
      </motion.div>}
    </AnimatePresence>
  </dialog>;
}
