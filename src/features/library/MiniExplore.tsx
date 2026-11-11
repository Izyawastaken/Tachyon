import { useEffect, useRef, useState } from 'react';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import ArrowUpRight from 'lucide-react/icons/arrow-up-right';
import Check from 'lucide-react/icons/check';
import Download from 'lucide-react/icons/download';
import { CATALOG, CONTENT_KINDS, type Pod, type PodContent, type ContentKind } from './data';
import { Empty, Modal, SearchField } from './components';

export function MiniExplore({ pod, onInstall, onClose }: { pod: Pod; onInstall: (item: PodContent) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [kind, setKind] = useState<ContentKind>('Mods');
  const [selected, setSelected] = useState<PodContent | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const back = useRef<HTMLButtonElement>(null);
  const cards = useRef<Map<string, HTMLButtonElement>>(new Map());
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (selected) back.current?.focus(); }, [selected]);
  const installed = (id: string) => pod.content.some(item => item.id === id);
  const install = (item: PodContent) => {
    if (installing || installed(item.id)) return;
    setInstalling(item.id);
    timer.current = setTimeout(() => { onInstall({ ...item, enabled: true, update: false }); setInstalling(null); }, 650);
  };
  const visible = CATALOG.filter(item => item.kind === kind && (category === 'All categories' || item.category === category) && `${item.name} ${item.author} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  const installButton = (item: PodContent) => <button className="pod-button pod-button-primary" type="button" disabled={installed(item.id) || Boolean(installing)} onClick={() => install(item)}>{installed(item.id) ? <Check size={16} /> : <Download size={16} />}{installed(item.id) ? 'Installed' : installing === item.id ? 'Installing…' : 'Install in pod'}</button>;
  return <Modal title="Add content" onClose={onClose} className="pod-explore-dialog">
    <div className="pod-explore-context"><span className="pod-eyebrow">ADDING TO {pod.name.toUpperCase()}</span><span>{pod.loader} <span aria-hidden="true">/</span> {pod.version}</span></div>
    {selected ? <section className="pod-catalog-detail"><button ref={back} className="pod-text-button" type="button" onClick={() => { const id = selected.id; setSelected(null); requestAnimationFrame(() => cards.current.get(id)?.focus()); }}><ArrowLeft size={16} /> Back to results</button><div className="pod-catalog-hero"><span className="pod-content-icon">{selected.name.slice(0, 2)}</span><div><h2>{selected.name}</h2><p>by {selected.author}</p></div>{installButton(selected)}</div><p className="pod-catalog-description">{selected.description}</p><div className="pod-detail-facts"><span>{selected.kind}</span><span>{selected.category}</span><span>Release {selected.version}</span></div><h3>Made for your next session.</h3><p className="pod-muted">Explore this sample release, add it to your pod, then keep looking for the next addition. Your installed content stays right where you left it.</p><div className="pod-release-preview"><div><strong>{selected.version}</strong><span>{pod.loader} · Minecraft {pod.version}</span></div><span>Preview release</span></div><p className="pod-hint">Sample catalog · compatibility and installation are simulated.</p></section> : <>
      <div className="pod-mini-heading"><h2>Find your next addition.</h2><p>A little more possibility for your world.</p></div><div className="pod-mini-toolbar"><SearchField value={query} onChange={setQuery} label="Search catalog" /><label className="pod-select-label"><span className="sr-only">Catalog category</span><select aria-label="Catalog category" value={category} onChange={e => setCategory(e.target.value)}>{['All categories', 'Performance', 'Graphics', 'Utility', 'Adventure'].map(x => <option key={x}>{x}</option>)}</select></label></div><div className="pod-segments" aria-label="Catalog content type">{CONTENT_KINDS.map(x => <button type="button" key={x} aria-pressed={kind === x} onClick={() => setKind(x)}>{x}</button>)}</div>
      <div className="pod-mini-grid">{visible.map(item => <article className="pod-mini-card" key={item.id}><button type="button" ref={el => { if (el) cards.current.set(item.id, el); else cards.current.delete(item.id); }} className="pod-mini-card-open" onClick={() => setSelected(item)} aria-label={`View ${item.name}`}><div><span className="pod-content-icon">{item.name.slice(0, 2)}</span><ArrowUpRight size={16} /></div><h3>{item.name}</h3><span className="pod-hint">by {item.author}</span><p>{item.description}</p></button><footer><span>{item.category}</span>{installButton(item)}</footer></article>)}</div>{!visible.length && <Empty title="Nothing here just yet." detail="Try a different search or category." action={<button type="button" className="pod-button" onClick={() => { setQuery(''); setCategory('All categories'); }}>Reset filters</button>} />}
    </>}
    <p className="pod-mini-status" role="status">{installing ? 'Adding to your preview pod…' : `${pod.content.length} additions in this pod · UI preview`}</p>
  </Modal>;
}
