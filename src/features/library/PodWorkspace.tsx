import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import ArrowUpRight from 'lucide-react/icons/arrow-up-right';
import Box from 'lucide-react/icons/box';
import Check from 'lucide-react/icons/check';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock3 from 'lucide-react/icons/clock-3';
import Copy from 'lucide-react/icons/copy';
import File from 'lucide-react/icons/file';
import Folder from 'lucide-react/icons/folder';
import Globe2 from 'lucide-react/icons/globe-2';
import Plus from 'lucide-react/icons/plus';
import Star from 'lucide-react/icons/star';
import { shellSpring } from '@/shell/motion';
import { CONTENT_KINDS, TABS, hours, type Pod, type PodFile, type PodTab, type ContentKind } from './data';
import { Empty, Modal, PodArt, SearchField } from './components';
import { MiniExplore } from './MiniExplore';

function Content({ pod, onChange, onAdd }: { pod: Pod; onChange: (pod: Pod) => void; onAdd: () => void }) {
  const [kind, setKind] = useState<ContentKind>('Mods');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All states');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState('Name');
  const visible = pod.content.filter(item => item.kind === kind && `${item.name} ${item.author}`.toLowerCase().includes(query.toLowerCase()) && (category === 'All categories' || item.category === category) && (filter === 'All states' || (filter === 'Enabled' ? item.enabled : filter === 'Disabled' ? !item.enabled : item.update))).sort((a, b) => sort === 'Name' ? a.name.localeCompare(b.name) : Number(b.update) - Number(a.update) || a.name.localeCompare(b.name));
  const reset = () => { setQuery(''); setFilter('All states'); setCategory('All categories'); };
  return <><div className="pod-section-heading"><div><h2>A world, made yours.</h2><p>All the little things that make this pod feel like home.</p></div><button type="button" className="pod-button pod-button-primary" onClick={onAdd}><Plus size={17} />Add mods</button></div><div className="pod-content-toolbar"><div className="pod-segments" aria-label="Installed content type">{CONTENT_KINDS.map(x => <button key={x} type="button" aria-pressed={kind === x} onClick={() => setKind(x)}>{x}<span>{pod.content.filter(item => item.kind === x).length}</span></button>)}</div><SearchField label="Search installed content" value={query} onChange={setQuery} /></div><div className="pod-filter-row"><div className="pod-filters"><label><span>State</span><select value={filter} onChange={e => setFilter(e.target.value)}>{['All states', 'Enabled', 'Disabled', 'Updates available'].map(x => <option key={x}>{x}</option>)}</select></label><label><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{['All categories', 'Performance', 'Graphics', 'Utility', 'Adventure'].map(x => <option key={x}>{x}</option>)}</select></label><label><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option>Name</option><option>Updates first</option></select></label></div><span className="pod-hint">{visible.length} {visible.length === 1 ? 'addition' : 'additions'}</span></div>
    {visible.length ? <div className="pod-content-list">{visible.map(item => <div className={`pod-content-row${!item.enabled ? ' is-disabled' : ''}`} key={item.id}><span className="pod-content-icon">{item.name.slice(0, 2)}</span><div className="pod-content-name"><strong>{item.name}</strong><span>by {item.author} <span aria-hidden="true">·</span> {item.category}</span></div><span className="pod-content-version">{item.version}{item.update && <small>Update available</small>}</span><button type="button" className="pod-switch" role="switch" aria-checked={item.enabled} aria-label={`Enable ${item.name}`} onClick={() => onChange({ ...pod, content: pod.content.map(x => x.id === item.id ? { ...x, enabled: !x.enabled } : x) })}><span /></button></div>)}</div> : <Empty title="A little room for possibility." detail={pod.content.some(x => x.kind === kind) ? 'No additions match these filters.' : `Your ${kind.toLowerCase()} will live here.`} action={<button type="button" className="pod-button" onClick={pod.content.some(x => x.kind === kind) ? reset : onAdd}>{pod.content.some(x => x.kind === kind) ? 'Reset filters' : 'Find additions'}<ArrowUpRight size={16} /></button>} />}
  </>;
}

function Files({ pod }: { pod: Pod }) {
  const [folder, setFolder] = useState('');
  const [query, setQuery] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [preview, setPreview] = useState<PodFile | null>(null);
  const entries = new Map<string, { path: string; directory: boolean; file?: PodFile }>();
  for (const file of pod.files) {
    if (!file.path.startsWith(folder)) continue;
    const relative = file.path.slice(folder.length);
    if (query && recursive) {
      if (file.path.toLowerCase().includes(query.toLowerCase())) entries.set(file.path, { path: file.path, directory: false, file });
    } else {
      const slash = relative.indexOf('/');
      const directory = slash >= 0;
      const path = directory ? folder + relative.slice(0, slash + 1) : file.path;
      const name = directory ? relative.slice(0, slash) : relative;
      if (!query || name.toLowerCase().includes(query.toLowerCase())) entries.set(path, { path, directory, file: directory ? undefined : file });
    }
  }
  const sorted = [...entries.values()].sort((a, b) => Number(b.directory) - Number(a.directory) || a.path.localeCompare(b.path));
  const crumbs = folder.split('/').filter(Boolean);
  return <><div className="pod-section-heading"><div><h2>Everything in its place.</h2><p>Browse your pod’s sample files, right down to the last folder.</p></div><span className="pod-preview-label">Read-only preview</span></div><div className="pod-files-toolbar"><SearchField label="Search files" value={query} onChange={setQuery} /><label className="pod-checkbox"><input type="checkbox" checked={recursive} onChange={e => setRecursive(e.target.checked)} />Include subfolders</label></div><nav className="pod-breadcrumb" aria-label="File location"><button type="button" onClick={() => setFolder('')}>Pod root</button>{crumbs.map((part, index) => <span key={index}><ChevronRight size={13} /><button type="button" onClick={() => setFolder(crumbs.slice(0, index + 1).join('/') + '/')}>{part}</button></span>)}</nav><div className="pod-file-list">{sorted.map(entry => <button type="button" className="pod-file-row" key={entry.path} onClick={() => entry.directory ? setFolder(entry.path) : setPreview(entry.file!)}>{entry.directory ? <Folder size={19} /> : <File size={19} />}<span>{query && recursive ? entry.path : entry.path.slice(folder.length).replace(/\/$/, '')}</span><small>{entry.directory ? 'Folder' : entry.file?.size}</small><ChevronRight size={15} /></button>)}</div>{!sorted.length && <Empty title="No files found." detail="Try a different search, include subfolders, or return to the pod root." action={<button type="button" className="pod-button" onClick={() => { setQuery(''); setFolder(''); setRecursive(true); }}>Reset file search</button>} />}{preview && <Modal title={preview.path} onClose={() => setPreview(null)}><pre className="pod-file-preview">{preview.text}</pre></Modal>}</>;
}

function Worlds({ pod }: { pod: Pod }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Pod['worlds'][number] | null>(null);
  const visible = pod.worlds.filter(x => x.name.toLowerCase().includes(query.toLowerCase()));
  return <><div className="pod-section-heading"><div><h2>Places you’ve made.</h2><p>Every build, every detour, every almost-finished house.</p></div><SearchField label="Search worlds" value={query} onChange={setQuery} /></div><div className="pod-world-grid">{visible.map((world, i) => <button className="pod-world-card" type="button" key={world.id} onClick={() => setSelected(world)}><PodArt motif={i ? 'forge' : pod.motif} /><div><span className="pod-eyebrow">{world.mode}</span><h3>{world.name}</h3><p>{world.size} <span>·</span> {world.played}</p><ArrowUpRight size={18} /></div></button>)}</div>{!visible.length && <Empty title={query ? 'No matching worlds.' : 'Your first world is waiting.'} detail={query ? 'Try another name.' : 'Worlds you create in this pod will appear here.'} />}{selected && <Modal title="World details" onClose={() => setSelected(null)}><div className="pod-dialog-intro"><Globe2 size={30} /><h2>{selected.name}</h2><p>{selected.mode} · Last played {selected.played.toLowerCase()}</p></div><dl className="pod-world-facts"><div><dt>Size on disk</dt><dd>{selected.size}</dd></div><div><dt>World seed</dt><dd>{selected.seed}</dd></div><div><dt>Minecraft</dt><dd>{pod.version}</dd></div></dl><p className="pod-hint">Sample world · no files are changed.</p></Modal>}</>;
}

function Logs({ pod }: { pod: Pod }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All levels');
  const [copied, setCopied] = useState('');
  const lines = (pod.files.find(x => x.path === 'logs/latest.log')?.text ?? '').split('\n').filter(Boolean);
  const visible = lines.filter(x => x.toLowerCase().includes(query.toLowerCase()) && (level === 'All levels' || x.includes(`/${level}]`)));
  return <><div className="pod-section-heading"><div><h2>Between the lines.</h2><p>A closer look at what happened in your last session.</p></div><button className="pod-button" type="button" disabled={!visible.length} onClick={() => { void navigator.clipboard.writeText(visible.join('\n')).then(() => setCopied('Copied visible logs.'), () => setCopied('Copy failed. Select and copy the log text instead.')); }}><Copy size={15} />Copy visible logs</button></div><div className="pod-files-toolbar"><SearchField label="Search logs" value={query} onChange={setQuery} /><select aria-label="Log level" value={level} onChange={e => setLevel(e.target.value)}>{['All levels', 'INFO', 'WARN', 'ERROR'].map(x => <option key={x}>{x}</option>)}</select></div><div className="pod-log-caption"><span>latest.log</span><span>{visible.length} lines · Sample session</span></div><div className="pod-log-view" aria-label="Log output">{visible.map((line, i) => <div key={i} className={line.includes('/WARN]') ? 'pod-log-warning' : ''}><span>{i + 1}</span><code>{line}</code></div>)}{!visible.length && <Empty title="Nothing to report." detail="No log lines match your search and level." />}</div><p className="pod-hint" role="status">{copied}</p></>;
}

function Share({ pod }: { pod: Pod }) {
  const [copied, setCopied] = useState('');
  return <><div className="pod-section-heading"><div><h2>Good worlds are shared.</h2><p>A place for your pod’s repository and the people joining you.</p></div></div><div className="pod-share-surface"><span className="pod-share-mark"><Globe2 size={36} strokeWidth={1} /></span><h3>{pod.source ? 'Your pod’s starting point.' : 'A setup worth passing on.'}</h3><p>{pod.source ? 'This is the repository used to create this preview pod.' : 'Create a share code from a GitHub repository when sharing is connected.'}</p>{pod.source ? <><p className="pod-source-link">{pod.source}</p><button type="button" className="pod-button" onClick={() => { void navigator.clipboard.writeText(pod.source!).then(() => setCopied('Repository link copied.'), () => setCopied('Could not copy. Select the repository link instead.')); }}><Copy size={16} />Copy repository link</button></> : <span className="pod-preview-label">Code generation coming later</span>}<p className="pod-hint" role="status">{copied || 'UI preview · publishing is not connected'}</p></div></>;
}

function Settings({ pod, onChange }: { pod: Pod; onChange: (pod: Pod) => void }) {
  const [name, setName] = useState(pod.name);
  const [description, setDescription] = useState(pod.description);
  const [motif, setMotif] = useState(pod.motif);
  const [saved, setSaved] = useState(false);
  function save(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; onChange({ ...pod, name: name.trim(), description, motif }); setSaved(true); }
  return <><div className="pod-section-heading"><div><h2>Make it feel like yours.</h2><p>A name, a note, a different point of view.</p></div></div><form className="pod-settings pod-form" onSubmit={save}><label>Pod name<input required maxLength={60} value={name} onChange={e => { setName(e.target.value); setSaved(false); }} /></label><label>Description<textarea maxLength={180} value={description} onChange={e => { setDescription(e.target.value); setSaved(false); }} /></label><fieldset><legend>Cover artwork</legend><div className="pod-cover-options">{(['terrain', 'forge', 'arch', 'orbit'] as const).map(x => <button key={x} type="button" className={motif === x ? 'is-selected' : ''} aria-label={`${x} cover`} aria-pressed={motif === x} onClick={() => { setMotif(x); setSaved(false); }}><PodArt motif={x} /></button>)}</div></fieldset><div className="pod-settings-save"><button type="submit" className="pod-button pod-button-primary" disabled={!name.trim()}>{saved ? <Check size={16} /> : null}{saved ? 'Saved' : 'Save changes'}</button><span className="pod-hint" role="status">{saved ? 'Saved to this preview session.' : 'Changes apply to this preview session.'}</span></div></form></>;
}

export function PodWorkspace({ pod, onChange, onClose }: { pod: Pod; onChange: (pod: Pod) => void; onClose: () => void }) {
  const [tab, setTab] = useState<PodTab>('Content');
  const [explore, setExplore] = useState(false);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => { back.current?.focus({ preventScroll: true }); }, []);
  return <motion.section className="pod-workspace" layoutId={`pod-${pod.id}`} transition={shellSpring} aria-label={`${pod.name} workspace`}>
    <header className="pod-workspace-topline"><button ref={back} type="button" className="pod-text-button" onClick={onClose}><ArrowLeft size={16} />All pods</button><span className="pod-preview-label">UI preview</span></header><div className="pod-workspace-scroll"><div className="pod-workspace-hero"><div className="pod-workspace-art"><PodArt motif={pod.motif} /></div><div className="pod-workspace-identity"><span className="pod-eyebrow">YOUR LITTLE UNIVERSE</span><h1>{pod.name}</h1><p>{pod.description}</p><div className="pod-detail-facts"><span><Box size={14} />{pod.loader} · {pod.version}</span><span><Clock3 size={14} />{hours(pod.hours)} played</span><span>{pod.lastPlayed === "Never played" ? pod.lastPlayed : `Last played ${pod.lastPlayed.toLowerCase()}`}</span></div></div><button type="button" className="pod-icon-button pod-workspace-star" aria-label={pod.favorite ? 'Unfavorite pod' : 'Favorite pod'} aria-pressed={pod.favorite} onClick={() => onChange({ ...pod, favorite: !pod.favorite })}><Star size={19} fill={pod.favorite ? 'currentColor' : 'none'} /></button></div>
    <div className="pod-tabs" role="tablist" aria-label="Pod sections" onKeyDown={event => { const index = TABS.indexOf(tab); const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null; if (next !== null) { event.preventDefault(); setTab(TABS[next]); document.getElementById(`pod-tab-${TABS[next]}`)?.focus(); } }}>{TABS.map(x => <button key={x} id={`pod-tab-${x}`} role="tab" type="button" aria-selected={tab === x} aria-controls={`pod-panel-${x}`} tabIndex={tab === x ? 0 : -1} onClick={() => setTab(x)}>{x}{tab === x && <motion.span layoutId="pod-tab-selection" transition={shellSpring} />}</button>)}</div>
    <div className="pod-tab-content">{TABS.map(x => <section key={x} role="tabpanel" id={`pod-panel-${x}`} aria-labelledby={`pod-tab-${x}`} hidden={tab !== x}><>{x === 'Content' ? <Content pod={pod} onChange={onChange} onAdd={() => setExplore(true)} /> : x === 'Files' ? <Files pod={pod} /> : x === 'Worlds' ? <Worlds pod={pod} /> : x === 'Logs' ? <Logs pod={pod} /> : x === 'Share' ? <Share pod={pod} /> : <Settings pod={pod} onChange={onChange} />}</></section>)}</div></div>
    {explore && <MiniExplore pod={pod} onClose={() => setExplore(false)} onInstall={item => { if (!pod.content.some(x => x.id === item.id)) onChange({ ...pod, content: [...pod.content, item] }); }} />}
  </motion.section>;
}
