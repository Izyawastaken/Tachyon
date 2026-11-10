import { SlidersHorizontal, RotateCcw, ChevronDown, Pin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { shellSpring } from "@/shell/motion";
import type { useHoverDrawer } from "../hooks/useHoverDrawer";
import { displayTag, type Filters, type SearchInput } from "../types";

interface Props {
  drawer: ReturnType<typeof useHoverDrawer>;
  input: SearchInput;
  filters: Filters | null;
  error: string | null;
  retry: () => void;
  onChange: (patch: Partial<SearchInput>) => void;
  disabled: boolean;
}

export function FilterDrawer({ drawer, input, filters, error, retry, onChange, disabled }: Props) {
  const reduced = useReducedMotion();
  const open = drawer.open && !disabled;
  const count = input.versions.length + input.loaders.length + input.categories.length + Number(Boolean(input.environment));
  return <motion.header className="explore-filter-drawer" initial={false}
    animate={{ height: open ? "auto" : 44 }} transition={reduced ? { duration: 0 } : shellSpring}
    {...drawer.handlers}>
    <div className="explore-drawer-bar">
      <span className="explore-wordmark">Explore <span>Modrinth catalog</span></span>
      <button ref={drawer.toggleRef} type="button" className="explore-filter-toggle" onClick={drawer.toggle}
        disabled={disabled} aria-expanded={open} aria-pressed={drawer.pinned} aria-controls="explore-filters"
        title="Hover to reveal filters. Click to keep them open.">
        <SlidersHorizontal size={15} aria-hidden="true" /> Filters {count > 0 && <span className="explore-filter-count">{count}</span>}
        {drawer.pinned ? <Pin size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
      </button>
    </div>
    <div id="explore-filters" className="explore-filter-panel" inert={!open} aria-hidden={!open}>
      {error ? <p className="explore-inline-error">Filters could not load. <button type="button" onClick={retry}>Retry</button></p> : null}
      <label>Minecraft version<select value={input.versions[0] ?? ""} onChange={event => onChange({ versions: event.target.value ? [event.target.value] : [] })}>
        <option value="">All versions</option>
        {filters?.versions.filter(version => version.version_type === "release").map(version => <option key={version.version} value={version.version}>{version.version}</option>)}
      </select></label>
      <label>Loader<select value={input.loaders[0] ?? ""} onChange={event => onChange({ loaders: event.target.value ? [event.target.value] : [] })}>
        <option value="">All loaders</option>
        {filters?.loaders.filter(loader => loader.supported_project_types.includes(input.kind)).map(loader => <option key={loader.name} value={loader.name}>{displayTag(loader.name)}</option>)}
      </select></label>
      <label>Category<select value={input.categories[0] ?? ""} onChange={event => onChange({ categories: event.target.value ? [event.target.value] : [] })}>
        <option value="">All categories</option>
        {filters?.categories.filter(category => category.project_type === (input.kind === "datapack" ? "mod" : input.kind)).map(category => <option key={`${category.project_type}-${category.name}`} value={category.name}>{displayTag(category.name)}</option>)}
      </select></label>
      <label>Environment<select value={input.environment} onChange={event => onChange({ environment: event.target.value })}>
        <option value="">Client &amp; server</option><option value="client">Client</option><option value="server">Server</option>
      </select></label>
      <label>Sort by<select value={input.sort} onChange={event => onChange({ sort: event.target.value as SearchInput["sort"] })}>
        <option value="relevance">Relevance</option><option value="downloads">Downloads</option><option value="follows">Followers</option><option value="newest">Newest</option><option value="updated">Recently updated</option>
      </select></label>
      <button type="button" className="explore-reset" onClick={() => onChange({ versions: [], loaders: [], categories: [], environment: "", sort: "relevance" })}>
        <RotateCcw size={14} aria-hidden="true" /> Reset filters
      </button>
    </div>
  </motion.header>;
}
