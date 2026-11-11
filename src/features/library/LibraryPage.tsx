import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import ArrowUpRight from 'lucide-react/icons/arrow-up-right';
import Box from 'lucide-react/icons/box';
import Clock3 from 'lucide-react/icons/clock-3';
import Plus from 'lucide-react/icons/plus';
import Star from 'lucide-react/icons/star';
import { ShellViewport } from '@/shell/components/ShellViewport';
import { shellSpring } from '@/shell/motion';
import { INITIAL_PODS, hours, type Pod } from './data';
import { Empty, PodArt, SearchField } from './components';
import { NewPodDialog } from './NewPodDialog';
import { PodWorkspace } from './PodWorkspace';
import './LibraryPage.css';

export default function LibraryPage({ sidebarOpen, active = true }: { sidebarOpen: boolean; active?: boolean }) {
  const [pods, setPods] = useState<Pod[]>(() => structuredClone(INITIAL_PODS));
  const [selected, setSelected] = useState<string | null>(null);
  const [create, setCreate] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All pods');
  const [sort, setSort] = useState('Recently played');
  const origin = useRef<HTMLButtonElement | null>(null);
  const pod = pods.find(x => x.id === selected);
  const visible = pods.filter(x => `${x.name} ${x.description} ${x.loader} ${x.version}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All pods' || (filter === 'Favorites' ? x.favorite : x.loader === filter))).sort((a, b) => sort === 'Name' ? a.name.localeCompare(b.name) : sort === 'Most played' ? b.hours - a.hours : pods.indexOf(a) - pods.indexOf(b));
  function update(next: Pod) { setPods(current => current.map(x => x.id === next.id ? next : x)); }
  return <div className="library-stage"><ShellViewport id={active ? 'workspace' : 'library-workspace'} expanded={sidebarOpen} scrollable={false}><div className="library-root">
    <section className="library-page" inert={Boolean(pod)} aria-hidden={Boolean(pod)} aria-label="Pod library"><div className="library-topline"><span>YOUR SPACE / LIBRARY</span><span>UI preview · Sample pods</span></div><header className="library-heading"><div><span className="pod-eyebrow">A HOME FOR EVERY WORLD</span><h1>Your little universes.</h1><p>Different worlds. Different moods. All right here.</p></div><button type="button" className="library-create" aria-label="Create a pod" aria-haspopup="dialog" aria-expanded={Boolean(create)} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setCreate({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }); }}><Plus size={25} strokeWidth={1.5} /></button></header>
    <div className="library-toolbar"><div className="pod-segments" aria-label="Library view">{['All pods', 'Favorites'].map(x => <button key={x} type="button" aria-pressed={filter === x} onClick={() => setFilter(x)}>{x}<span>{x === 'All pods' ? pods.length : pods.filter(p => p.favorite).length}</span></button>)}</div><div className="library-search-sort"><SearchField label="Search pods" value={query} onChange={setQuery} /><select aria-label="Sort pods" value={sort} onChange={e => setSort(e.target.value)}>{['Recently played', 'Most played', 'Name'].map(x => <option key={x}>{x}</option>)}</select></div></div>
    <div className="library-grid">{visible.map((item, index) => <motion.article className="library-pod" layoutId={`pod-${item.id}`} transition={shellSpring} key={item.id}><button type="button" className="library-pod-open" aria-label={`Open ${item.name}`} onClick={e => { origin.current = e.currentTarget; setSelected(item.id); }}><div className="library-pod-cover"><PodArt motif={item.motif} /><span className="library-pod-index">{String(index + 1).padStart(2, '0')}</span><span className="library-pod-arrow"><ArrowUpRight size={20} /></span></div><div className="library-pod-body"><span className="pod-eyebrow">{item.loader} <span aria-hidden="true">/</span> {item.version}</span><h2>{item.name}</h2><p>{item.description}</p><div className="library-pod-stats"><span><Clock3 size={14} />{hours(item.hours)}</span><span><Box size={14} />{item.content.length} additions</span></div><div className="library-pod-bottom"><span>{item.lastPlayed === 'Never played' ? item.lastPlayed : `Played ${item.lastPlayed.toLowerCase()}`}</span><span>Open pod <ArrowUpRight size={13} /></span></div></div></button><button className="library-pod-favorite pod-icon-button" type="button" aria-label={`${item.favorite ? 'Unfavorite' : 'Favorite'} ${item.name}`} aria-pressed={item.favorite} onClick={() => update({ ...item, favorite: !item.favorite })}><Star size={16} fill={item.favorite ? 'currentColor' : 'none'} /></button></motion.article>)}</div>
    {!visible.length && <Empty title="A world of possibility." detail="No pods match this view. Try another search or start something new." action={<button className="pod-button" type="button" onClick={() => { setQuery(''); setFilter('All pods'); }}>Reset library view</button>} />}
    <footer className="library-footer"><span>{pods.length} pods <span aria-hidden="true">/</span> {hours(pods.reduce((total, item) => total + item.hours, 0))} well spent</span><span>A place for every kind of player.</span></footer></section>
    <AnimatePresence onExitComplete={() => origin.current?.focus({ preventScroll: true })}>{pod && <PodWorkspace key={pod.id} pod={pod} onChange={update} onClose={() => setSelected(null)} />}</AnimatePresence>
    {create && <NewPodDialog origin={create} onClose={() => setCreate(null)} onCreate={item => { setPods(current => [item, ...current]); setQuery(''); setFilter('All pods'); setSort('Recently played'); setCreate(null); setSelected(item.id); }} />}
  </div></ShellViewport></div>;
}
