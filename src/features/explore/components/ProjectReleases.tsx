import { useEffect, useRef, useState } from "react";
import Download from "lucide-react/icons/download";
import ArrowLeft from "lucide-react/icons/arrow-left";
import ArrowRight from "lucide-react/icons/arrow-right";
import ChevronDown from "lucide-react/icons/chevron-down";
import { errorMessage, getVersion, getVersions } from "../api";
import { useProjectDownload } from "../hooks/useProjectDownload";
import { displayTag, fullNumber, type CatalogResult, type Project, type ProjectHit, type ProjectVersion, type VersionDetail, type VersionFile, type VersionInput, type VersionPage } from "../types";
import { ProjectMarkdown } from "./ProjectMarkdown";

const dates = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
export function fileSize(bytes: number) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function published(date: string) { const value = new Date(date); return Number.isNaN(value.valueOf()) ? date : dates.format(value); }

export function ProjectReleases({ hit, project, active, mode, onMode, onImage }: {
  hit: ProjectHit; project?: Project; active: boolean; mode: "versions" | "changelog";
  onMode: (mode: "versions" | "changelog") => void; onImage: (src: string, title: string) => void;
}) {
  const [input, setInput] = useState<VersionInput>({ project_id: hit.project_id, game_version: "", loader: "", channel: "", offset: 0 });
  const [result, setResult] = useState<CatalogResult<VersionPage> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<CatalogResult<VersionDetail> | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRetry, setDetailRetry] = useState(0);
  const download = useProjectDownload(hit.project_id);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    setLoading(true); setError(null);
    queueMicrotask(() => {
      if (live) void getVersions(input).then(data => { if (live) { setResult(data); setLoading(false); } })
        .catch(cause => { if (live) { setError(errorMessage(cause)); setLoading(false); } });
    });
    return () => { live = false; };
  }, [active, input, retry]);
  const page = result?.data;
  const selectedId = selected ?? page?.versions[0]?.id;
  useEffect(() => {
    if (!active || !selectedId || (mode !== "changelog" && selected !== selectedId)) return;
    let live = true;
    setDetailError(null);
    queueMicrotask(() => {
      if (live) void getVersion(selectedId).then(data => { if (live) setDetail(data); })
        .catch(cause => { if (live) setDetailError(errorMessage(cause)); });
    });
    return () => { live = false; };
  }, [active, mode, selected, selectedId, detailRetry]);
  const change = (patch: Partial<VersionInput>) => {
    setInput(current => ({ ...current, ...patch, offset: patch.offset ?? 0 }));
    setResult(null); setSelected(null); setDetail(null);
    requestAnimationFrame(() => root.current?.scrollIntoView({ block: "start" }));
  };
  const currentVersion = page?.versions.find(version => version.id === selectedId);
  const currentDetail = detail?.data.version.id === selectedId ? detail : null;
  const start = (version: ProjectVersion, file: VersionFile) => { void download.start(version, file); };
  const files = (version: ProjectVersion) => <div className="release-files">{version.files.map(file => <div key={file.filename}>
    <div><strong>{file.filename}</strong><span>{fileSize(file.size)}{file.primary ? " · Primary file" : " · Additional file"}</span></div>
    <button type="button" className="release-download" disabled={download.busy} onClick={() => start(version, file)} aria-label={`Download ${file.filename}`}><Download size={15} /><span>Download</span></button>
  </div>)}</div>;
  const dependencies = (version: ProjectVersion) => {
    const items = currentDetail?.data.version.id === version.id ? currentDetail.data.dependencies : version.dependencies.map(dependency => ({ name: dependency.file_name ?? dependency.project_id ?? dependency.version_id ?? "External dependency", dependency_type: dependency.dependency_type, url: null }));
    return items.length > 0 && <div className="release-dependencies"><h3>Dependencies</h3><ul>{items.map((dependency, index) => <li key={`${dependency.name}-${index}`}>
      {dependency.url ? <a href={dependency.url}>{dependency.name}</a> : <span>{dependency.name}</span>}<span>{displayTag(dependency.dependency_type)}</span>
    </li>)}</ul></div>;
  };
  return <section ref={root} hidden={!active} className="project-releases" aria-label={mode === "versions" ? "Project versions" : "Project changelog"} aria-busy={loading}>
    <div className="release-filters">
      <label>Minecraft<select value={input.game_version} onChange={event => change({ game_version: event.target.value })}><option value="">All versions</option>{(project?.game_versions ?? hit.versions).slice().reverse().map(version => <option key={version}>{version}</option>)}</select></label>
      <label>Loader<select value={input.loader} onChange={event => change({ loader: event.target.value })}><option value="">All loaders</option>{(project?.loaders ?? []).map(loader => <option key={loader} value={loader}>{displayTag(loader)}</option>)}</select></label>
      <label>Channel<select value={input.channel} onChange={event => change({ channel: event.target.value })}><option value="">All channels</option><option value="release">Release</option><option value="beta">Beta</option><option value="alpha">Alpha</option></select></label>
    </div>
    <p className="release-save-note">Downloads save the selected file to a folder you choose.</p>
    {download.busy && <div className="release-transfer" aria-live="off"><div><strong>{download.filename}</strong><span>{!download.progress ? "Choose where to save the file…" : download.progress.stage === "verifying" ? "Verifying download…" : `${fileSize(download.progress.downloaded)} of ${fileSize(download.progress.total)}`}</span></div>
      {download.progress && <><progress max={download.progress.total} value={download.progress.downloaded} aria-label="File download progress" /><button type="button" onClick={download.cancel}>Cancel</button></>}
    </div>}
    {!download.busy && download.receipt && <p className="release-saved" role="status">Saved {download.receipt.filename}<span>{download.receipt.path}</span></p>}
    {download.error && <p className="explore-detail-error" role="alert">{download.error}</p>}
    {result?.stale && <p className="explore-cache-notice">Showing saved releases. Check compatibility before downloading.</p>}
    {error ? <div className="explore-detail-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Retry releases</button></div>
      : !page ? <p className="project-body-loading" role="status">Loading releases…</p>
      : page.total === 0 ? <div className="explore-message"><h2>No matching releases</h2><p>Try another Minecraft version, loader or channel.</p><button type="button" onClick={() => change({ game_version: "", loader: "", channel: "" })}>Clear release filters</button></div>
      : <>
        <div className="release-list-heading"><h2>{mode === "versions" ? "Versions" : "Changelog"}</h2><span>{fullNumber.format(page.total)} releases</span></div>
        {mode === "versions" ? <div className="release-list">{page.versions.map(version => {
          const primary = version.files.find(file => file.primary) ?? version.files[0];
          return <section key={version.id} className="release-row">
            <div className="release-row-heading"><div><h3>{version.name}</h3><p>{version.version_number}<span className="release-channel" data-channel={version.version_type}>{displayTag(version.version_type)}</span>{version.featured && <span>Featured</span>}</p></div>
              {primary && <button className="release-download" type="button" disabled={download.busy} aria-label={`Download ${version.name}`} onClick={() => start(version, primary)}><Download size={16} /> Download</button>}</div>
            <div className="release-compatibility"><span>Minecraft {version.game_versions.join(", ")}</span><span>{version.loaders.map(displayTag).join(" · ")}</span></div>
            <div className="release-row-footer"><span><time dateTime={version.date_published}>{published(version.date_published)}</time> · {fullNumber.format(version.downloads)} downloads{primary ? ` · ${fileSize(primary.size)}` : ""}</span>
              <div><button type="button" onClick={() => { setSelected(version.id); onMode("changelog"); }}>Changelog</button><button type="button" aria-expanded={selected === version.id} onClick={() => setSelected(current => current === version.id ? null : version.id)}>Files &amp; dependencies <ChevronDown size={13} /></button></div></div>
            {selected === version.id && <div className="release-row-expanded">{files(version)}{dependencies(version)}{version.files.length === 0 && <p>No downloadable files are listed.</p>}</div>}
          </section>;
        })}</div> : <div className="release-changelog">
          <label className="release-picker">Release<select value={selectedId ?? ""} onChange={event => { setSelected(event.target.value); setDetail(null); }}>{page.versions.map(version => <option key={version.id} value={version.id}>{version.name} · {displayTag(version.version_type)}</option>)}</select></label>
          {currentVersion && <><div className="release-changelog-heading"><h3>{currentVersion.name}</h3><time dateTime={currentVersion.date_published}>{published(currentVersion.date_published)}</time></div>
            {detailError ? <div className="explore-detail-error" role="alert"><p>{detailError}</p><button type="button" onClick={() => setDetailRetry(value => value + 1)}>Retry changelog</button></div>
              : !currentDetail ? <p role="status">Loading changelog…</p> : <>
                {currentDetail.stale && <p className="explore-cache-notice">Showing a saved changelog.</p>}
                {currentDetail.data.changelog_html ? <ProjectMarkdown html={currentDetail.data.changelog_html} onImage={onImage} /> : <p className="release-save-note">The author has not provided a changelog for this release.</p>}
                <h3 className="release-files-title">Release files</h3>{files(currentDetail.data.version)}{dependencies(currentDetail.data.version)}
              </>}
          </>}
        </div>}
        <nav className="release-pagination" aria-label="Release pages"><button type="button" disabled={loading || page.offset === 0} onClick={() => change({ offset: Math.max(0, page.offset - page.limit) })}><ArrowLeft size={15} /> Previous</button><span>{Math.floor(page.offset / page.limit) + 1} / {Math.ceil(page.total / page.limit)}</span><button type="button" disabled={loading || page.offset + page.limit >= page.total} onClick={() => change({ offset: page.offset + page.limit })}>Next <ArrowRight size={15} /></button></nav>
      </>}
  </section>;
}
