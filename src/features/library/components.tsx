import { useEffect, useRef, type ReactNode } from 'react';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';

export function SearchField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <label className="pod-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{label}</span><input type="search" aria-label={label} value={value} placeholder={`${label}…`} onChange={e => onChange(e.target.value)} />{value && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange('')}><X size={14} /></button>}</label>;
}

export function PodArt({ motif }: { motif: string }) {
  return <div className={`pod-art pod-art-${motif}`} aria-hidden="true"><div className="pod-art-grid" /><i /><i /><i /><span className="pod-art-coordinate">{motif === 'terrain' ? 'OVERWORLD / 01' : motif === 'forge' ? 'WORKSHOP / 02' : motif === 'arch' ? 'ORIGIN / 03' : 'AFTER DARK / 04'}</span></div>;
}

export function Modal({ title, children, onClose, className = '', origin }: { title: string; children: ReactNode; onClose: () => void; className?: string; origin?: { x: number; y: number } }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    if (origin) {
      // offsetLeft/Top describe the final box without the opening animation.
      dialog.style.setProperty('--pod-create-x', `${origin.x - dialog.offsetLeft - dialog.offsetWidth + 28}px`);
      dialog.style.setProperty('--pod-create-y', `${origin.y - dialog.offsetTop - 28}px`);
    }
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`pod-dialog ${className}`} aria-label={title} onCancel={e => { e.preventDefault(); closeRef.current(); }} onClick={e => { if (e.target === e.currentTarget) closeRef.current(); }}><div className="pod-dialog-inner"><header className="pod-dialog-heading"><span>{title}</span><button type="button" className="pod-icon-button" aria-label={`Close ${title}`} onClick={onClose}><X size={18} /></button></header>{children}</div></dialog>;
}

export function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="pod-empty"><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
