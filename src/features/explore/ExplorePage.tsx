import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ArrowLeft, ArrowRight, X } from "lucide-react";
import { ShellViewport } from "@/shell/components/ShellViewport";
import { useCatalog, useDebouncedValue, useFilters } from "./hooks/useCatalog";
import { useHoverDrawer } from "./hooks/useHoverDrawer";
import { FilterDrawer } from "./components/FilterDrawer";
import { TypeSelector } from "./components/TypeSelector";
import { ProjectCard } from "./components/ProjectCard";
import { CONTENT_TYPES, fullNumber, INITIAL_SEARCH, type SearchInput } from "./types";
import "./ExplorePage.css";

export default function ExplorePage({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [input, setInput] = useState<SearchInput>(INITIAL_SEARCH);
  const query = useDebouncedValue(input.query, 220);
  const applied = useMemo(() => ({ ...input, query }), [query, input.kind, input.versions, input.loaders, input.categories, input.environment, input.sort, input.offset]);
  const catalog = useCatalog(applied);
  const metadata = useFilters();
  const top = useHoverDrawer();
  const bottom = useHoverDrawer();
  const scroll = useRef<HTMLDivElement>(null);
  const change = useCallback((patch: Partial<SearchInput>) => setInput(current => ({ ...current, ...patch, offset: patch.offset ?? 0 })), []);
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [applied]);
  const page = catalog.result?.data;
  const kind = CONTENT_TYPES.find(type => type.id === input.kind)!;
  return <div className="explore-stage">
    <FilterDrawer drawer={top} input={input} filters={metadata.filters} error={metadata.error} retry={metadata.retry} onChange={change} disabled={false} />
    <ShellViewport expanded={sidebarOpen || top.open || bottom.open} scrollable={false}>
      <section className="explore-content" aria-label="Explore catalog" aria-busy={catalog.loading}>
        <div className="explore-heading">
          <div><h1>{kind.label}</h1><p role="status">{catalog.loading ? "Finding your next addition…" : page ? `${fullNumber.format(page.total_hits)} projects to make it yours` : "Discover something for your next world"}</p></div>
          <label className="explore-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search {kind.label.toLowerCase()}</span>
            <input type="search" value={input.query} placeholder={`Search ${kind.label.toLowerCase()}…`} onChange={event => change({ query: event.target.value })} />
            {input.query && <button type="button" aria-label="Clear search" onClick={() => change({ query: "" })}><X size={14} /></button>}
          </label>
        </div>
        <div className="explore-grid-scroll" ref={scroll}>
          {catalog.result?.stale && <p className="explore-cache-notice" role="status">Showing saved results. Live catalog validation is unavailable.</p>}
          {catalog.error ? <div className="explore-message" role="alert"><h2>Catalog unavailable</h2><p>{catalog.error}</p><button type="button" onClick={catalog.retry}>Try again</button></div>
            : !page ? <div className="explore-grid" aria-label="Loading projects">{Array.from({ length: 12 }, (_, index) => <div key={index} className="project-skeleton" />)}</div>
            : page.hits.length === 0 ? <div className="explore-message"><h2>No projects found</h2><p>Try another search or widen your filters.</p><button type="button" onClick={() => setInput({ ...INITIAL_SEARCH, kind: input.kind })}>Clear search &amp; filters</button></div>
            : <div className="explore-grid">{page.hits.map(project => <ProjectCard key={project.project_id} project={project} />)}</div>}
        </div>
        <div className="explore-pagination">
          <span>Hold <kbd>Space</kbd> over a project for Quick Look</span>
          <div><button type="button" aria-label="Previous page" disabled={catalog.loading || input.offset === 0} onClick={() => change({ offset: Math.max(0, input.offset - 24) })}><ArrowLeft size={16} /></button>
            <span>{page ? fullNumber.format(page.offset / 24 + 1) : "1"}</span>
            <button type="button" aria-label="Next page" disabled={catalog.loading || !page || page.offset + page.limit >= page.total_hits || input.offset >= 10_000 - 24} onClick={() => change({ offset: input.offset + 24 })}><ArrowRight size={16} /></button></div>
        </div>
      </section>
    </ShellViewport>
    <TypeSelector drawer={bottom} kind={input.kind} onChange={kind => change({ kind, loaders: [], categories: [] })} disabled={false} />
  </div>;
}
