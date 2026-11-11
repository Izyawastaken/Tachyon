import { useState } from "react";
import { ArrowUpRight, ArrowRight, Gem, TrendingUp, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ShellViewport } from "@/shell/components/ShellViewport";
import { ProjectImage } from "@/features/explore/components/ProjectImage";
import { useFeed, type Entry, type Section } from "./api";
import "./HomePage.css";

const number = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
function ModCard({ entry, rank, section }: { entry: Entry; rank: number; section: Section }) {
  const { project } = entry;
  const [error, setError] = useState(false);
  async function open() {
    try { await openUrl(`https://moddex.gg/mod/${encodeURIComponent(project.slug)}`); setError(false); }
    catch { setError(true); }
  }
  return <article className={`home-mod home-mod-${section}`}>
    <button className="home-mod-link" onClick={() => void open()} aria-label={`View ${project.name} on Moddex`}>
      {section === "trending" && <span className="home-rank" aria-label={`Rank ${rank}`}>{String(rank).padStart(2, "0")}</span>}
      <ProjectImage url={project.logo_url} title={project.name} />
      <span className="home-mod-copy"><strong>{project.name}</strong>
        {section === "gems" && <span className="home-summary">{project.summary || "A smaller mod with a strong community reception."}</span>}
        <span className="home-mod-meta">{section === "trending"
          ? `${entry.recent_ratings} recent ${entry.recent_ratings === 1 ? "rater" : "raters"}`
          : `${number.format(project.downloads_count ?? 0)} downloads`}
          <span aria-hidden="true">·</span>{project.rating.average === null ? "Unrated" : `${project.rating.average.toFixed(1)} / 5`}
          {section === "gems" && <span>({project.rating.count} ratings)</span>}
        </span>
      </span><ArrowUpRight size={18} className="home-open" aria-hidden="true" />
    </button>
    {error && <p className="home-link-error" role="alert">Could not open your browser. Try again.</p>}
  </article>;
}
function DiscoverySection({ section }: { section: Section }) {
  const { feed, error, loading, retry } = useFeed(section);
  const trending = section === "trending";
  return <section className="home-section" aria-labelledby={`home-${section}`} aria-busy={loading}>
    <div className="home-section-heading"><div className="home-section-title">
      {trending ? <TrendingUp size={20} aria-hidden="true" /> : <Gem size={20} aria-hidden="true" />}
      <h2 id={`home-${section}`}>{trending ? "Trending this week" : "Hidden gems"}</h2>
    </div><span className="home-section-label">{trending ? "Community activity" : "Small audience. Strong reviews."}</span></div>
    <p className="home-section-description">{trending ? "Mods getting attention from Moddex raters over the past 7 days." : "Rated at least 4 / 5 by 3 or more people, with fewer than 100k downloads."}</p>
    {error ? <div className="home-feedback" role="alert"><p>{error}</p><button onClick={retry}><RefreshCw size={15} aria-hidden="true" /> Try again</button></div>
      : !feed ? <div className="home-grid" role="status" aria-label={`Loading ${trending ? "trending mods" : "hidden gems"}`}>
        {Array.from({ length: trending ? 8 : 2 }, (_, i) => <div className="home-skeleton" key={i} aria-hidden="true" />)}
      </div> : feed.entries.length === 0 ? <div className="home-feedback"><p>{trending ? "No recent community ratings to rank yet. Check back soon." : "No mods meet the hidden-gem criteria right now."}</p></div>
      : <div className="home-grid">{feed.entries.map((entry, i) => <ModCard key={entry.project.id} entry={entry} rank={i + 1} section={section} />)}</div>}
    {feed && <p className="home-source-note" role="status">{feed.stale ? "Showing a recent saved snapshot. Refreshing when available. " : ""}
      {trending && `${feed.sampled} recent ratings sampled${feed.total > feed.sampled ? ` of ${number.format(feed.total)}` : ""} · Ranked by distinct raters, then latest activity.`}
      {!trending && "Ordered by Moddex’s adjusted review score."}</p>}
  </section>;
}
export default function HomePage({ sidebarOpen, onExplore }: { sidebarOpen: boolean; onExplore: () => void }) {
  return <ShellViewport expanded={sidebarOpen}><div className="home-page">
    <div className="home-topline" data-tauri-drag-region><span>Tachyon <span className="home-topline-separator">/</span> Discover</span><span>Make your next world different.</span></div>
    <header className="home-header"><div><p className="home-eyebrow">A little off the beaten path</p><h1>Your next great mod.</h1><p>Fresh attention. Overlooked favorites. More reasons to play.</p></div>
      <button className="home-explore" onClick={onExplore}>Explore all mods <ArrowRight size={17} aria-hidden="true" /></button>
    </header>
    <DiscoverySection section="trending" />
    <DiscoverySection section="gems" />
    <footer className="home-footer"><span>Discovery powered by <a href="https://moddex.gg" onClick={event => { event.preventDefault(); void openUrl("https://moddex.gg").catch(() => {}); }}>Moddex <ArrowUpRight size={12} aria-hidden="true" /></a></span>
      <details><summary>How these picks work</summary><p>Trending uses up to the 50 latest Moddex ratings from the last 7 days, including star-only ratings. Each person counts once per mod. This measures recent attention within that sample, not download growth or a platform-wide trend. Hidden gems have fewer than 100,000 downloads, at least 3 ratings and an average of 4 stars or higher; Moddex’s Bayesian score sets their order. Downloads are used only as a ceiling for gems. Data refreshes every few minutes.</p></details>
    </footer>
  </div></ShellViewport>;
}
