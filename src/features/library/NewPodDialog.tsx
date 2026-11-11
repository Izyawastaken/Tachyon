import { useRef, useState, type FormEvent } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import ArrowUpRight from 'lucide-react/icons/arrow-up-right';
import Box from 'lucide-react/icons/box';
import Fingerprint from 'lucide-react/icons/fingerprint-pattern';
import CodeSlots from '@/components/CodeSlots';
import { Modal } from './components';
import type { Pod } from './data';

export function NewPodDialog({ onClose, onCreate, origin }: { onClose: () => void; onCreate: (pod: Pod) => void; origin: { x: number; y: number } }) {
  const [mode, setMode] = useState<'choose' | 'custom' | 'import'>('choose');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.21.1');
  const [loader, setLoader] = useState('Fabric');
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  function create(event: FormEvent) {
    event.preventDefault();
    const imported = mode === 'import';
    if (imported ? !link : !name.trim()) return;
    onCreate({ id: crypto.randomUUID(), name: imported ? decodeURIComponent(new URL(link).pathname.split('/').filter(Boolean).pop() ?? 'Imported pod') : name.trim(), description: imported ? 'Your shared world, ready for a fresh start.' : 'A fresh space for your next adventure.', version, loader, hours: 0, lastPlayed: 'Never played', favorite: false, motif: 'orbit', content: [], files: [], worlds: [], source: imported ? link : undefined });
  }
  async function resolve() {
    const id = ++request.current;
    setBusy(true); setError(''); setLink('');
    try {
      if (!isTauri()) throw new Error('Open Tachyon on desktop to look up this repository code.');
      const result = await invoke<string>('library_resolve_code', { code });
      if (id === request.current) setLink(result);
    } catch (cause) { if (id === request.current) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (id === request.current) setBusy(false); }
  }
  return <Modal title="New pod" onClose={onClose} className="pod-create-dialog" origin={origin}>
    {mode === 'choose' ? <><div className="pod-dialog-intro"><span className="pod-eyebrow">ROOM FOR SOMETHING NEW</span><h2>Every world starts here.</h2><p>Build it your way, or pick up where someone else began.</p></div><div className="pod-create-options"><button type="button" onClick={() => setMode('custom')}><Box size={24} /><span><strong>Create a custom pod</strong><small>A version, a loader, a world of possibilities.</small></span><ArrowUpRight size={18} /></button><button type="button" onClick={() => setMode('import')}><Fingerprint size={24} /><span><strong>Import from a code</strong><small>Eight characters. Someone’s whole setup.</small></span><ArrowUpRight size={18} /></button></div></> : <form onSubmit={create}>
      <button className="pod-text-button" type="button" onClick={() => { ++request.current; setBusy(false); setMode('choose'); setError(''); }}><ArrowLeft size={15} /> All options</button>
      <div className="pod-dialog-intro"><span className="pod-eyebrow">{mode === 'custom' ? 'A BLANK CANVAS' : 'BRING A WORLD WITH YOU'}</span><h2>{mode === 'custom' ? 'Make yourself at home.' : 'A little code. A new beginning.'}</h2><p>{mode === 'custom' ? 'Give your pod a name and choose its foundation.' : 'Paste a share code to find its GitHub repository.'}</p></div>
      {mode === 'custom' ? <div className="pod-form"><label>Pod name<input autoFocus required maxLength={60} placeholder="My next great adventure" value={name} onChange={e => setName(e.target.value)} /></label><div className="pod-form-row"><label>Minecraft version<select value={version} onChange={e => setVersion(e.target.value)}>{['1.21.4', '1.21.1', '1.20.1', '1.19.2', '1.8.9'].map(x => <option key={x}>{x}</option>)}</select></label><label>Mod loader<select value={loader} onChange={e => setLoader(e.target.value)}>{['Fabric', 'Forge', 'NeoForge', 'Quilt', 'Vanilla'].map(x => <option key={x}>{x}</option>)}</select></label></div></div> : <div className="pod-import">
        <CodeSlots length={8} characterSet="alphanumeric" value={code} onChange={value => { ++request.current; setCode(value); setLink(''); setError(''); setBusy(false); }} ariaLabel="Repository share code" autoFocus disabled={busy} slotSize={40} gap={6} accentColor="var(--theme-text)" inkColor="var(--theme-text)" digitColor="var(--theme-background)" slotColor="var(--theme-border)" dangerColor="var(--semantic-error)" />
        <p className="pod-hint">Format XXXX-XXXX · for example 1B6F-8TGK</p><button className="pod-button" type="button" disabled={code.length !== 8 || busy} onClick={() => void resolve()}>{busy ? 'Finding repository…' : 'Find repository'}<ArrowUpRight size={16} /></button>
        {error && <p className="pod-error" role="alert">{error}</p>}{link && <div className="pod-resolved" role="status"><span>Repository found</span><p>{link}</p></div>}
      </div>}
      <footer className="pod-dialog-footer"><span>UI preview · no game files are downloaded</span><button type="submit" className="pod-button pod-button-primary" disabled={mode === 'custom' ? !name.trim() : !link}>{mode === 'custom' ? 'Create pod' : 'Continue'}<ArrowUpRight size={16} /></button></footer>
    </form>}
  </Modal>;
}
