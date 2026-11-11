import { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CATEGORIES, type CategoryId } from './model';
import { CATEGORY_ICONS, CATEGORY_LABELS } from './navigation';

type Bounds = { x: number; width: number };
export function GooeyNav({ active, onSelect, reducedMotion }: { active: CategoryId; onSelect: (id: CategoryId) => void; reducedMotion: boolean }) {
  const systemReduced = useReducedMotion();
  const reduced = systemReduced || reducedMotion;
  const filterId = `settings-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Bounds>({ x: 0, width: 0 });
  const [hover, setHover] = useState<Bounds | null>(null);

  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    let mounted = true;
    const update = () => {
      if (!mounted) return;
      const button = element.querySelector<HTMLButtonElement>(`[data-category="${active}"]`);
      if (button) setSelected({ x: button.offsetLeft, width: button.offsetWidth });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.querySelectorAll('button').forEach(button => observer.observe(button));
    document.fonts.ready.then(update);
    element.querySelector(`[data-category="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
    return () => { mounted = false; observer.disconnect(); };
  }, [active, reduced]);

  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 360, damping: 26, mass: .8 };
  return <nav className="settings-topnav" aria-label="Settings categories">
    <svg className="settings-goo-filter" aria-hidden="true"><defs><filter id={filterId} x="-30%" y="-80%" width="160%" height="260%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="goo" /><feComposite in="SourceGraphic" in2="goo" operator="atop" /></filter></defs></svg>
    <div className="settings-topnav-scroll"><div ref={track} className="settings-topnav-track" onPointerLeave={() => setHover(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(null); }} onKeyDown={event => {
      const index = CATEGORIES.findIndex(category => category.id === active);
      const next = event.key === 'ArrowRight' ? (index + 1) % CATEGORIES.length : event.key === 'ArrowLeft' ? (index + CATEGORIES.length - 1) % CATEGORIES.length : event.key === 'Home' ? 0 : event.key === 'End' ? CATEGORIES.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); onSelect(CATEGORIES[next].id);
      track.current?.querySelector<HTMLButtonElement>(`[data-category="${CATEGORIES[next].id}"]`)?.focus({ preventScroll: true });
    }}>
      <div className="settings-topnav-ink" style={{ filter: reduced ? 'none' : `url(#${filterId})` }} aria-hidden="true">
        <motion.span className="settings-topnav-pill" initial={false} animate={{ x: selected.x, width: selected.width, opacity: selected.width ? 1 : 0 }} transition={transition} />
        {!reduced && <motion.span className="settings-topnav-drop" initial={false} animate={{ x: selected.x + selected.width / 2 - 13, scaleX: 1, opacity: selected.width ? 1 : 0 }} transition={{ type: 'spring', stiffness: 180, damping: 18, mass: .8 }} />}
        <motion.span className="settings-topnav-hover" initial={false} animate={{ x: hover?.x ?? selected.x, width: hover?.width ?? selected.width, opacity: hover && hover.x !== selected.x ? .7 : 0, scale: hover ? 1 : .8 }} transition={transition} />
      </div>
      {CATEGORIES.map(category => {
        const Icon = CATEGORY_ICONS[category.id];
        return <button type="button" key={category.id} data-category={category.id} aria-label={category.label} aria-current={active === category.id ? 'page' : undefined} onClick={() => onSelect(category.id)} onPointerEnter={event => setHover({ x: event.currentTarget.offsetLeft, width: event.currentTarget.offsetWidth })} onFocus={event => setHover({ x: event.currentTarget.offsetLeft, width: event.currentTarget.offsetWidth })}><Icon size={15} strokeWidth={1.7} /><span>{CATEGORY_LABELS[category.id]}</span></button>;
      })}
    </div></div>
  </nav>;
}
