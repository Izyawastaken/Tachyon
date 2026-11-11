import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, Check, ChevronDown, RotateCcw, X } from 'lucide-react';
import type { Setting, SettingValue } from './model';

export function SettingsButton({ children, onClick, disabled, primary, danger, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; danger?: boolean; label?: string }) {
  return <button type="button" className={`settings-button${primary ? ' is-primary' : ''}${danger ? ' is-danger' : ''}`} onClick={onClick} disabled={disabled} aria-label={label}>{children}</button>;
}

export function SettingField({ field, value, onChange, instance, overridden, onReset, disabled }: {
  field: Setting; value: SettingValue; onChange: (value: SettingValue) => void;
  instance: boolean; overridden: boolean; onReset: () => void; disabled?: boolean;
}) {
  const id = `setting-${field.id}`;
  const description = `${id}-description`;
  return <div className={`settings-field${field.type === 'textarea' || field.id.endsWith('Dir') || field.id.endsWith('Path') ? ' is-wide' : ''}`} data-disabled={disabled || undefined} data-setting={field.id}>
    <div className="settings-field-copy">
      <div className="settings-field-title"><label htmlFor={id}>{field.label}</label>
        {instance && field.instance && <span className={`settings-inheritance${overridden ? ' is-overridden' : ''}`}>{overridden ? 'Overridden' : 'Inherited'}</span>}
        {instance && !field.instance && <span className="settings-inheritance">Launcher-wide</span>}
      </div>
      <p id={description}>{field.description}</p>
      {instance && field.instance && overridden && <button type="button" className="settings-reset-value" aria-label={`Reset ${field.label} to inherited`} onClick={onReset}><RotateCcw size={11} /> Reset to global</button>}
    </div>
    <div className="settings-field-control">
      {field.type === 'toggle' ? <button type="button" id={id} role="switch" aria-checked={Boolean(value)} aria-labelledby={`${id}-label`} aria-label={field.label} aria-describedby={description} disabled={disabled} onClick={() => onChange(!value)} className="settings-switch"><span id={`${id}-label`} className="sr-only">{field.label}</span><span aria-hidden="true">{Boolean(value) && <Check size={10} strokeWidth={3} />}</span></button>
        : field.type === 'select' ? <div className="settings-select"><select id={id} value={String(value)} aria-describedby={description} disabled={disabled} onChange={event => onChange(event.target.value)}>{field.options?.map(option => <option key={option}>{option}</option>)}</select><ChevronDown size={13} aria-hidden="true" /></div>
        : field.type === 'textarea' ? <textarea id={id} value={String(value)} aria-describedby={description} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder={field.placeholder} rows={3} maxLength={12000} spellCheck={false} />
        : field.type === 'number' ? <div className="settings-number"><input id={id} type="number" value={Number(value)} aria-describedby={description} min={field.min} max={field.max} step={field.step ?? 1} disabled={disabled} onChange={event => {
          if (event.target.value === '') return;
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.max(field.min!, Math.min(field.max!, Math.round(next))));
        }} /><span>{field.unit}</span></div>
        : <input id={id} type="text" value={String(value)} aria-describedby={description} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder={field.placeholder} maxLength={12000} spellCheck={false} />}
    </div>
  </div>;
}

export function SettingsNote({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="settings-note">{icon}<div>{children}</div></div>;
}

export function ActionRow({ title, description, action, onClick, disabled }: { title: string; description: string; action: string; onClick: () => void; disabled?: boolean }) {
  return <div className="settings-action-row"><div><h4>{title}</h4><p>{description}</p></div><SettingsButton onClick={onClick} disabled={disabled}>{action}<ArrowUpRight size={13} /></SettingsButton></div>;
}

export interface PreviewAction {
  title: string;
  description: string;
  items?: { label: string; value: string }[];
  confirm?: string;
  danger?: boolean;
  onConfirm?: () => void;
}
export function PreviewDialog({ action, onClose }: { action: PreviewAction; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const origin = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    cancel.current?.focus();
    return () => origin.current?.focus({ preventScroll: true });
  }, []);
  return <dialog className="settings-dialog" ref={dialog} aria-labelledby="settings-dialog-title" aria-describedby="settings-dialog-description" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) {
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  } }}>
    <div className="settings-dialog-top"><span>UI PREVIEW</span><button type="button" aria-label="Close preview" onClick={onClose}><X size={18} /></button></div>
    <h2 id="settings-dialog-title">{action.title}</h2><p id="settings-dialog-description">{action.description}</p>
    {action.items && <dl>{action.items.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
    <div className="settings-dialog-note">Changes affect sample data and local preview preferences only.</div>
    <footer><button type="button" ref={cancel} className="settings-button" onClick={onClose}>{action.confirm ? 'Cancel' : 'Close'}</button>{action.confirm && <SettingsButton primary danger={action.danger} onClick={() => { action.onConfirm?.(); onClose(); }}>{action.confirm}</SettingsButton>}</footer>
  </dialog>;
}
