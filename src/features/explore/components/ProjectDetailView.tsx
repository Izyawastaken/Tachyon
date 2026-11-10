import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, ExternalLink, Download, Heart, Code2, BookOpen, CircleHelp } from "lucide-react";
import { motion } from "motion/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { shellSpring } from "@/shell/motion";
import { errorMessage, getProject } from "../api";
import { CONTENT_TYPES, displayTag, fullNumber, type CatalogResult, type ProjectDetail, type ProjectHit } from "../types";
import { ProjectImage } from "./ProjectImage";

export function ProjectDetailView({ hit, onClose }: { hit: ProjectHit; onClose: () => void }) {
  const [result, setResult] = useState<CatalogResult<ProjectDetail> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    setError(null);
    queueMicrotask(() => {
      if (active) void getProject(hit.project_id).then(data => { if (active) setResult(data); })
        .catch(cause => { if (active) setError(errorMessage(cause)); });
    });
    back.current?.focus({ preventScroll: true });
    return () => { active = false; };
  }, [hit.project_id, retry]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  const project = result?.data.project;
  const external = async (url: string) => {
    try { if (new URL(url).protocol === "https:") await openUrl(url); }
    catch { setError("The link could not be opened. Try again."); }
  };
  const link = (event: MouseEvent<HTMLElement>) => {
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (anchor) { event.preventDefault(); void external(anchor.href); }
  };
  return <motion.section className="project-detail" layoutId={`project-${hit.project_id}`} transition={shellSpring} role="region" aria-labelledby="project-detail-title">
    <div className="project-detail-toolbar"><button ref={back} type="button" onClick={onClose}><ArrowLeft size={17} /> Back to {CONTENT_TYPES.find(type => type.id === hit.project_type)?.label.toLowerCase() ?? "results"}</button>
      <span>{CONTENT_TYPES.find(type => type.id === hit.project_type)?.singular ?? "Project"}</span></div>
    <div className="project-detail-scroll">
      <header className="project-detail-hero">
        <motion.div layoutId={`project-icon-${hit.project_id}`}><ProjectImage url={hit.icon_url} title={hit.title} /></motion.div>
        <div><motion.h1 layout="position" id="project-detail-title">{hit.title}</motion.h1><p>by {hit.author}</p></div>
      </header>
      <p className="project-detail-summary">{hit.description}</p>
      <div className="project-detail-facts"><span><Download size={15} /> {fullNumber.format(project?.downloads ?? hit.downloads)} downloads</span><span><Heart size={15} /> {fullNumber.format(project?.followers ?? hit.follows)} followers</span></div>
      {result?.stale && <p className="explore-cache-notice">Showing saved project information.</p>}
      {error && <div className="explore-detail-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      <div className="project-detail-columns">
        <article className="project-description">
          <h2>About {hit.title}</h2>
          {result ? <div className="project-markdown" onClick={link} dangerouslySetInnerHTML={{ __html: result.data.body_html }} />
            : !error ? <div className="project-body-loading" role="status">Loading project details…</div> : null}
          {project && project.gallery.length > 0 && <section className="project-gallery"><h2>Gallery</h2><div>{project.gallery.slice(0, 6).map(image => <ProjectImage key={image.url} url={image.url} title={image.title ?? `${hit.title} screenshot`} gallery />)}</div></section>}
        </article>
        <aside className="project-info" aria-label="Project compatibility and links">
          <section><h2>Compatibility</h2><h3>Minecraft</h3><div className="project-info-tags">{(project?.game_versions ?? hit.versions).slice(-12).reverse().map(version => <span key={version}>{version}</span>)}</div>
            {project && project.loaders.length > 0 && <><h3>Loaders</h3><div className="project-info-tags">{project.loaders.map(loader => <span key={loader}>{displayTag(loader)}</span>)}</div></>}
          </section>
          <section><h2>Categories</h2><div className="project-info-tags">{(project?.categories ?? hit.display_categories).map(category => <span key={category}>{displayTag(category)}</span>)}</div></section>
          {project && <section><h2>Project links</h2>
            <button type="button" onClick={() => { void external(`https://modrinth.com/${project.project_type}/${encodeURIComponent(project.slug)}`); }}><ExternalLink size={15} /> View on Modrinth</button>
            {project.source_url && <button type="button" onClick={() => { void external(project.source_url!); }}><Code2 size={15} /> Source code</button>}
            {project.wiki_url && <button type="button" onClick={() => { void external(project.wiki_url!); }}><BookOpen size={15} /> Documentation</button>}
            {project.issues_url && <button type="button" onClick={() => { void external(project.issues_url!); }}><CircleHelp size={15} /> Report an issue</button>}
            <h3>License</h3><p>{project.license.name || project.license.id}</p>
          </section>}
        </aside>
      </div>
    </div>
  </motion.section>;
}
