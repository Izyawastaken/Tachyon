import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Camera from "lucide-react/icons/camera";
import Search from "lucide-react/icons/search";
import SlidersHorizontal from "lucide-react/icons/sliders-horizontal";
import ChevronLeft from "lucide-react/icons/chevron-left";
import Pin from "lucide-react/icons/pin";
import X from "lucide-react/icons/x";
import FolderPlus from "lucide-react/icons/folder-plus";
import RotateCcw from "lucide-react/icons/rotate-ccw";
import RefreshCw from "lucide-react/icons/refresh-cw";
import type { MasonryItem } from "@/components/Masonry";
import { ScreenshotGallery } from "./ScreenshotGallery";
import { ShellViewport } from "@/shell/components/ShellViewport";
import { useHoverDrawer } from "@/features/explore/hooks/useHoverDrawer";
import { getScreenshots, linkInstance, screenshotAsset } from "./api";
import { filterScreenshots, INITIAL_FILTERS, type ScreenshotFilters, type ScreenshotLibrary } from "./types";
import "./ScreenshotsPage.css";

const drawerSpring = { type: "spring" as const, stiffness: 260, damping: 32, mass: 1 };
const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const number = new Intl.NumberFormat();

export default function ScreenshotsPage({ sidebarOpen }: { sidebarOpen: boolean }) {
  const reduced = useReducedMotion();
  const drawer = useHoverDrawer();
  const [library, setLibrary] = useState<ScreenshotLibrary | null>(null);
  const [filters, setFilters] = useState<ScreenshotFilters>(INITIAL_FILTERS);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"load" | "link" | null>("load");
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const working = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const [viewerOpen, setViewerOpen] = useState(false);
  useEffect(() => { if (viewerOpen) drawer.close(); }, [viewerOpen, drawer.close]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const load = useCallback(async (link = false) => {
    if (working.current) return;
    working.current = true;
    setBusy(link ? "link" : "load");
    setError("");
    try {
      const result = await (link ? linkInstance() : getScreenshots());
      if (mounted.current && result) setLibrary(result);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : String(error));
    } finally {
      working.current = false;
      if (mounted.current) setBusy(null);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [load]);
  const screenshots = library?.screenshots;
  const visible = useMemo(() => filterScreenshots(screenshots ?? [], filters, query), [screenshots, filters, query]);
  const items = useMemo<MasonryItem[]>(() => visible.map(item => ({
    id: item.id, img: screenshotAsset(item.path), width: item.width, height: item.height,
    title: item.filename.replace(/\.png$/i, ""),
    description: [item.instance, item.version, item.loader, date.format(item.taken_at)].filter(Boolean).join(" · "),
    alt: `${item.filename} from ${item.instance}`,
  })), [visible]);
  const options = useMemo(() => {
    const all = screenshots ?? [];
    const unique = (values: (string | null)[]) => [...new Set(values.map(value => value ?? "unknown"))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    const instances = [...new Map(all.map(item => [item.instance_id, { id: item.instance_id, name: item.instance }])).values()].sort((a, b) => a.name.localeCompare(b.name));
    return { instances, versions: unique(all.map(item => item.version)), loaders: unique(all.map(item => item.loader)) };
  }, [screenshots]);
  const count = Object.entries(filters).filter(([key, value]) => key !== "sort" && Boolean(value)).length;
  const open = drawer.open && !viewerOpen;
  const change = (key: keyof ScreenshotFilters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const reset = () => { setFilters(INITIAL_FILTERS); setQuery(""); };
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [filters, query]);
  const transition = reduced ? { duration: 0 } : drawerSpring;

  return <div className="screenshots-stage" data-filters-open={open}>
    <ShellViewport expanded={sidebarOpen || open} scrollable={false}>
      <section className="screenshots-content" aria-label="Screenshot library" aria-busy={Boolean(busy)}>
        <header className="screenshots-heading">
          <div><h1>Screenshots</h1><p role="status">{busy === "load" && !library ? "Finding your screenshots…" : library ? `${number.format(visible.length)} ${visible.length === 1 ? "screenshot" : "screenshots"}${count || query ? ` of ${number.format(library.screenshots.length)}` : " from your worlds"}` : "Your worlds, frame by frame"}</p></div>
          <div className="screenshots-actions">
            <button type="button" onClick={() => void load()} disabled={Boolean(busy)} aria-label="Refresh screenshots" title="Refresh screenshots"><RefreshCw size={16} className={busy === "load" ? "screenshots-refreshing" : undefined} /></button>
            <button type="button" className="screenshots-link" onClick={() => void load(true)} disabled={Boolean(busy)}><FolderPlus size={16} /> <span>{busy === "link" ? "Linking…" : "Link instance"}</span></button>
          </div>
        </header>
        <div className="screenshots-toolbar">
          <label className="screenshots-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search screenshots</span><input type="search" placeholder="Search your screenshots…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label>
          <span className="screenshots-sort-label">{filters.sort === "newest" ? "Newest first" : filters.sort === "oldest" ? "Oldest first" : "By filename"}</span>
        </div>
        {error && <div className="screenshots-notice" role="alert"><span>{error}</span><button type="button" disabled={Boolean(busy)} onClick={() => void load()}>Try again</button></div>}
        {library?.warnings.map(warning => <p className="screenshots-notice" role="status" key={warning}>{warning}</p>)}
        {count > 0 && <div className="screenshots-active-filters" aria-label="Active filters">{Object.entries(filters).filter(([key, value]) => key !== "sort" && Boolean(value)).map(([key, value]) => <button type="button" key={key} onClick={() => change(key as keyof ScreenshotFilters, "")} aria-label={`Remove ${key} filter`}>{key === "instance" ? options.instances.find(item => item.id === value)?.name : key === "period" ? `Last ${value} days` : value === "unknown" ? "Unknown " + key : value}<X size={12} /></button>)}<button type="button" onClick={reset}>Clear all</button></div>}
        <div ref={scroll} className="screenshots-scroll">
          {!library && busy ? <div className="screenshots-skeleton" aria-label="Loading screenshots">{Array.from({ length: 8 }, (_, index) => <div key={index} />)}</div>
            : items.length ? <ScreenshotGallery items={items} onLightboxChange={setViewerOpen} />
              : <div className="screenshots-empty"><Camera size={32} strokeWidth={1.25} aria-hidden="true" /><h2>{screenshots?.length ? "No matching screenshots" : "Your next world is worth a screenshot"}</h2><p>{screenshots?.length ? "Try another search or widen your filters." : "Press F2 in Minecraft to capture a moment. Link an instance folder to bring its screenshots here."}</p><button type="button" disabled={Boolean(busy)} onClick={screenshots?.length ? reset : () => void load(true)}>{screenshots?.length ? "Clear search & filters" : "Link instance"}</button></div>}
        </div>
        <footer className="screenshots-footer"><span>F2 to capture. Click a screenshot to look closer.</span><span>{library ? `${library.sources.length} linked ${library.sources.length === 1 ? "folder" : "folders"}` : "Local screenshots"}</span></footer>
      </section>
    </ShellViewport>
    <motion.aside className="screenshots-filter-drawer" initial={false}
      animate={{ width: open ? compact ? 208 : 280 : 48 }} transition={transition}
      {...drawer.handlers} aria-label="Screenshot filters">
      <div className="screenshots-filter-rail">
        <button ref={drawer.toggleRef} type="button" className="screenshots-filter-toggle" onClick={drawer.toggle} disabled={viewerOpen}
          aria-label="Screenshot filters" aria-expanded={open} aria-pressed={drawer.pinned} aria-controls="screenshot-filters"
          title="Hover to reveal filters. Click to keep them open."><SlidersHorizontal size={19} />{count > 0 && <span>{count}</span>}</button>
        <span className="screenshots-rail-label" aria-hidden="true">Filters</span>
      </div>
      <motion.div id="screenshot-filters" className="screenshots-filter-panel" inert={!open} aria-hidden={!open}
        initial={false} animate={{ opacity: open ? 1 : 0, x: open ? 0 : 14 }} transition={transition}>
        <div className="screenshots-filter-heading"><h2>Filters</h2><button type="button" onClick={() => { drawer.toggleRef.current?.focus(); drawer.close(); }} aria-label="Close filters">{drawer.pinned ? <Pin size={15} /> : <ChevronLeft size={17} />}</button></div>
        <div className="screenshots-filter-fields">
          <label>Instance<select value={filters.instance} onChange={event => change("instance", event.target.value)}><option value="">All instances</option>{options.instances.map(value => <option key={value.id} value={value.id} title={value.id}>{value.name}</option>)}</select></label>
          <label>Minecraft version<select value={filters.version} onChange={event => change("version", event.target.value)}><option value="">All versions</option>{options.versions.map(value => <option key={value} value={value}>{value === "unknown" ? "Unknown version" : value}</option>)}</select></label>
          <label>Mod loader<select value={filters.loader} onChange={event => change("loader", event.target.value)}><option value="">All loaders</option>{options.loaders.map(value => <option key={value} value={value}>{value === "unknown" ? "Unknown loader" : value}</option>)}</select></label>
          <label>Date taken<select value={filters.period} onChange={event => change("period", event.target.value)}><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="365">Last year</option></select></label>
          <label>Orientation<select value={filters.orientation} onChange={event => change("orientation", event.target.value)}><option value="">All orientations</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option><option value="square">Square</option></select></label>
          <label>Sort by<select value={filters.sort} onChange={event => change("sort", event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Filename</option></select></label>
          <button type="button" className="screenshots-reset" onClick={reset}><RotateCcw size={14} /> Reset filters</button>
        </div>
        <p className="screenshots-filter-note">Versions and loaders come from the linked instance’s settings. Older captures may use different versions.</p>
      </motion.div>
    </motion.aside>
  </div>;
}
