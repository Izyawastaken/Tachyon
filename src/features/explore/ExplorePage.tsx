import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { searchIdentity } from "./api";
import { useQuickLook } from "./hooks/useQuickLook";
import { ProjectDetailView } from "./components/ProjectDetailView";
import Search from "lucide-react/icons/search";
import ArrowLeft from "lucide-react/icons/arrow-left";
import ArrowRight from "lucide-react/icons/arrow-right";
import X from "lucide-react/icons/x";
import { ShellViewport } from "@/shell/components/ShellViewport";
import { useCatalog, useDebouncedValue, useFilters } from "./hooks/useCatalog";
import { useHoverDrawer } from "./hooks/useHoverDrawer";
import { FilterDrawer } from "./components/FilterDrawer";
import { TypeSelector } from "./components/TypeSelector";
import { ProjectCard } from "./components/ProjectCard";
import { CONTENT_TYPES, fullNumber, INITIAL_SEARCH, PAGE_SIZE, type SearchInput, type ProjectHit } from "./types";
import "./ExplorePage.css";

export default function ExplorePage({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [input, setInput] = useState<SearchInput>(INITIAL_SEARCH);
  const query = useDebouncedValue(input.query, 220);
  const applied = useMemo(() => ({ ...input, query }), [query, input.kind, input.versions, input.loaders, input.categories, input.environment, input.sort, input.offset]);
  const catalog = useCatalog(applied, input.query === query);
  const metadata = useFilters();
  const top = useHoverDrawer();
  const bottom = useHoverDrawer();
  const [selected, setSelected] = useState<ProjectHit | null>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const quick = useQuickLook(searchIdentity(applied), !selected);
  const openProject = useCallback((project: ProjectHit, element: HTMLButtonElement) => {
    origin.current = element;
    quick.clear(); top.close(); bottom.close();
    setSelected(project);
  }, [quick.clear, top.close, bottom.close]);
  const closeProject = useCallback(() => setSelected(null), []);
  const scroll = useRef<HTMLDivElement>(null);
  const change = useCallback((patch: Partial<SearchInput>) => setInput(current => ({ ...current, ...patch, offset: patch.offset ?? 0 })), []);
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [applied]);
  const page = catalog.result?.data;
  const kind = CONTENT_TYPES.find(type => type.id === input.kind)!;
  return <div className="explore-stage">
    <FilterDrawer drawer={top} input={input} filters={metadata.filters} error={metadata.error} retry={metadata.retry} onChange={change} disabled={Boolean(selected)} />
    <ShellViewport expanded={sidebarOpen || top.open || bottom.open} scrollable={false}>
      <section className="explore-content" inert={Boolean(selected)} aria-hidden={Boolean(selected)} aria-label="Explore catalog" aria-busy={catalog.loading}>
        <div className="explore-heading">
          <div><h1>{kind.label}</h1><p role="status">{catalog.loading ? "Finding your next addition…" : page ? `${fullNumber.format(page.total_hits)} projects to make it yours` : "Discover something for your next world"}</p></div>
          <label className="explore-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search {kind.label.toLowerCase()}</span>
            <input type="search" value={input.query} placeholder={`Search ${kind.label.toLowerCase()}…`} onChange={event => change({ query: event.target.value })} />
            {input.query && <button type="button" aria-label="Clear search" onClick={() => change({ query: "" })}><X size={14} /></button>}
          </label>
        </div>
        <div className="explore-grid-scroll" ref={scroll}>
          {catalog.result?.stale && <p className="explore-cache-notice" role="status">Showing saved results. Refreshing when available.</p>}
          {catalog.error ? <div className="explore-message" role="alert"><h2>Catalog unavailable</h2><p>{catalog.error}</p><button type="button" onClick={catalog.retry}>Try again</button></div>
            : !page ? <div className="explore-grid" aria-label="Loading projects">{Array.from({ length: 12 }, (_, index) => <div key={index} className="project-skeleton" />)}</div>
            : page.hits.length === 0 ? <div className="explore-message"><h2>No projects found</h2><p>Try another search or widen your filters.</p><button type="button" onClick={() => setInput({ ...INITIAL_SEARCH, kind: input.kind })}>Clear search &amp; filters</button></div>
            : <div className="explore-grid">{page.hits.map(project => <ProjectCard key={project.project_id} project={project} quick={quick.quickId === project.project_id} onOpen={openProject} onHover={quick.hover} onCancel={quick.clear} />)}</div>}
        </div>
        <div className="explore-pagination">
          <span>Hold <kbd>Space</kbd> over a project for Quick Look</span>
          <div><button type="button" aria-label="Previous page" disabled={catalog.loading || input.offset === 0} onClick={() => change({ offset: Math.max(0, input.offset - PAGE_SIZE) })}><ArrowLeft size={16} /></button>
            <span>{page ? fullNumber.format(page.offset / page.limit + 1) : "1"}</span>
            <button type="button" aria-label="Next page" disabled={catalog.loading || !page || page.offset + page.limit >= page.total_hits || input.offset >= 10_000 - PAGE_SIZE} onClick={() => change({ offset: input.offset + PAGE_SIZE })}><ArrowRight size={16} /></button></div>
        </div>
      </section>
      <AnimatePresence onExitComplete={() => origin.current?.focus({ preventScroll: true })}>
        {selected && <ProjectDetailView key={selected.project_id} hit={selected} onClose={closeProject} />}
      </AnimatePresence>
    </ShellViewport>
    <TypeSelector drawer={bottom} kind={input.kind} onChange={kind => change({ kind, loaders: [], categories: [] })} disabled={Boolean(selected)} />
  </div>;
}
