import { useEffect, useRef, useState, type MouseEvent } from "react";
import ArrowLeft from "lucide-react/icons/arrow-left";
import ExternalLink from "lucide-react/icons/external-link";
import Download from "lucide-react/icons/download";
import Heart from "lucide-react/icons/heart";
import Code2 from "lucide-react/icons/code-xml";
import BookOpen from "lucide-react/icons/book-open";
import CircleHelp from "lucide-react/icons/circle-help";
import { motion } from "motion/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { shellSpring } from "@/shell/motion";
import SplitText from "@/components/SplitText";
import { errorMessage, getProject } from "../api";
import { CONTENT_TYPES, displayTag, fullNumber, type CatalogResult, type ProjectDetail, type ProjectHit } from "../types";
import { ProjectImage } from "./ProjectImage";
import { ProjectMarkdown } from "./ProjectMarkdown";
import { ImageViewer } from "./ImageViewer";
import { ProjectReleases } from "./ProjectReleases";

const revealFrom = { opacity: 0, y: 6 };
const revealTo = { opacity: 1, y: 0 };
const detailTabs = ["description", "versions", "changelog", "gallery"] as const;
type DetailTab = typeof detailTabs[number];

function DetailText({ text }: { text: string }) {
  const words = text.trim().split(/\s+/).length;
  return <SplitText text={text} tag="span" textAlign="left" splitType="words"
    trigger="load" duration={0.28} delay={Math.min(16, 120 / Math.max(1, words - 1))}
    from={revealFrom} to={revealTo} ease="power2.out" className="project-detail-text" />;
}

export function ProjectDetailView({ hit, onClose }: { hit: ProjectHit; onClose: () => void }) {
  const [result, setResult] = useState<CatalogResult<ProjectDetail> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [image, setImage] = useState<{ src: string; title: string } | null>(null);
  const [tab, setTab] = useState<DetailTab>("description");
  const tabAnchor = useRef<HTMLDivElement>(null);
  const switchTab = (next: DetailTab) => {
    setTab(next);
    requestAnimationFrame(() => tabAnchor.current?.scrollIntoView({ block: "start" }));
  };
  const viewImage = (src: string, title: string) => setImage({ src, title });
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
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !image) { event.preventDefault(); onClose(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose, image]);
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
    <div className="project-detail-scroll"><div className="project-detail-document">
      <header className="project-detail-hero">
        <motion.div layoutId={`project-icon-${hit.project_id}`}><ProjectImage url={hit.icon_url} title={hit.title} /></motion.div>
        <div className="project-detail-identity"><motion.h1 layout="position" id="project-detail-title"><DetailText text={hit.title} /></motion.h1><p><DetailText text={`by ${hit.author}`} /></p></div>
        <button type="button" className="project-primary-download" onClick={() => { switchTab("versions"); document.getElementById(`project-tab-${hit.project_id}-versions`)?.focus({ preventScroll: true }); }}><Download size={18} /> Download</button>
      </header>
      <p className="project-detail-summary"><DetailText text={hit.description} /></p>
      <div className="project-detail-facts"><span><Download size={15} /> {fullNumber.format(project?.downloads ?? hit.downloads)} downloads</span><span><Heart size={15} /> {fullNumber.format(project?.followers ?? hit.follows)} followers</span></div>
      {result?.stale && <p className="explore-cache-notice">Showing saved project information.</p>}
      {error && <div className="explore-detail-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      <div ref={tabAnchor} aria-hidden="true" />
      <div className="project-detail-tabs" role="tablist" aria-label="Project information" onKeyDown={event => {
        const index = detailTabs.indexOf(tab);
        const next = event.key === "ArrowRight" ? (index + 1) % detailTabs.length : event.key === "ArrowLeft" ? (index + detailTabs.length - 1) % detailTabs.length : event.key === "Home" ? 0 : event.key === "End" ? detailTabs.length - 1 : null;
        if (next !== null) { event.preventDefault(); switchTab(detailTabs[next]); document.getElementById(`project-tab-${hit.project_id}-${detailTabs[next]}`)?.focus({ preventScroll: true }); }
      }}>{detailTabs.map(value => <button key={value} type="button" role="tab" id={`project-tab-${hit.project_id}-${value}`} aria-controls={`project-panel-${hit.project_id}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => switchTab(value)}>
        {tab === value && <motion.span className="project-detail-tab-active" layoutId={`project-detail-tab-${hit.project_id}`} transition={shellSpring} />}<span>{displayTag(value)}</span>
      </button>)}</div>
      <div className="project-detail-columns">
        <article className="project-description" onClick={link} role="tabpanel" id={`project-panel-${hit.project_id}`} aria-labelledby={`project-tab-${hit.project_id}-${tab}`} tabIndex={0}>
          {tab === "description" && <><h2><DetailText text={`About ${hit.title}`} /></h2>
            {result ? <ProjectMarkdown html={result.data.body_html} onImage={viewImage} />
              : !error ? <div className="project-body-loading" role="status">Loading project details…</div> : null}</>}
          <ProjectReleases hit={hit} project={project} active={tab === "versions" || tab === "changelog"} mode={tab === "changelog" ? "changelog" : "versions"} onMode={switchTab} onImage={viewImage} />
          {tab === "gallery" && <section className="project-gallery project-gallery-tab"><h2><DetailText text="Gallery" /></h2>{!project ? <p role="status">Loading gallery…</p> : project.gallery.length > 0 ? <div>{project.gallery.map((image, index) => <figure key={image.url}><ProjectImage url={image.raw_url || image.url} title={image.title ?? `${hit.title} screenshot ${index + 1}`} gallery onOpen={viewImage} />{image.title && <figcaption>{image.title}</figcaption>}</figure>)}</div> : <p className="release-save-note">The author has not added gallery images.</p>}</section>}
        </article>
        <aside className="project-info" aria-label="Project compatibility and links">
          <section><h2><DetailText text="Compatibility" /></h2><h3>Minecraft</h3><div className="project-info-tags">{(project?.game_versions ?? hit.versions).slice(-12).reverse().map(version => <span key={version}>{version}</span>)}</div>
            {(project?.game_versions ?? hit.versions).length > 12 && <details className="project-all-versions"><summary>All supported versions</summary><div className="project-info-tags">{(project?.game_versions ?? hit.versions).slice().reverse().map(version => <span key={version}>{version}</span>)}</div></details>}
            {project && project.loaders.length > 0 && <><h3>Loaders</h3><div className="project-info-tags">{project.loaders.map(loader => <span key={loader}>{displayTag(loader)}</span>)}</div></>}
          </section>
          <section><h2><DetailText text="Categories" /></h2><div className="project-info-tags">{(project?.categories ?? hit.display_categories).map(category => <span key={category}>{displayTag(category)}</span>)}</div></section>
          {project && <section><h2><DetailText text="Project links" /></h2>
            <button type="button" onClick={() => { void external(`https://modrinth.com/${project.project_type}/${encodeURIComponent(project.slug)}`); }}><ExternalLink size={15} /> View on Modrinth</button>
            {project.source_url && <button type="button" onClick={() => { void external(project.source_url!); }}><Code2 size={15} /> Source code</button>}
            {project.wiki_url && <button type="button" onClick={() => { void external(project.wiki_url!); }}><BookOpen size={15} /> Documentation</button>}
            {project.issues_url && <button type="button" onClick={() => { void external(project.issues_url!); }}><CircleHelp size={15} /> Report an issue</button>}
            <h3>License</h3><p>{project.license.name || project.license.id}</p>
          </section>}
        </aside>
      </div>
    </div>
    </div>
    {image && <ImageViewer {...image} onClose={() => setImage(null)} />}
  </motion.section>;
}
