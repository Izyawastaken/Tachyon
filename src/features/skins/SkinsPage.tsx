import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import Plus from "lucide-react/icons/plus";
import Upload from "lucide-react/icons/upload";
import UserRound from "lucide-react/icons/user-round";
import Link from "lucide-react/icons/link";
import Search from "lucide-react/icons/search";
import Star from "lucide-react/icons/star";
import Check from "lucide-react/icons/check";
import Download from "lucide-react/icons/download";
import Trash2 from "lucide-react/icons/trash-2";
import Pencil from "lucide-react/icons/pencil";
import X from "lucide-react/icons/x";
import ArrowUpRight from "lucide-react/icons/arrow-up-right";
import { ShellViewport } from "@/shell/components/ShellViewport";
import { shellSpring } from "@/shell/motion";
import { asset, editSkin, errorMessage, exportSkin, getLibrary, importFiles, importPlayer } from "./api";
import type { ImportResult, SkinLibrary, SkinModel } from "./types";
import "./SkinsPage.css";

const SkinPreview = lazy(() => import("./components/SkinPreview"));
type Filter = "all" | "custom" | "favorites";
type Method = "upload" | "player" | "texture";

export default function SkinsPage({ sidebarOpen }: { sidebarOpen: boolean }) {
  const reduced = useReducedMotion();
  const [library, setLibrary] = useState<SkinLibrary | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [model, setModel] = useState<SkinModel>("classic");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState<Method>("upload");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [rename, setRename] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const loadGeneration = useRef(0);
  const pendingDrop = useRef<(paths: string[]) => void>(() => {});
  const selected = library?.skins.find(skin => skin.id === selectedId) ?? library?.skins.find(skin => skin.id === library.active_id);
  const active = selected?.id === library?.active_id && selected?.model === model;
  const visible = useMemo(() => library?.skins.filter(skin =>
    (filter === "all" || (filter === "custom" ? skin.origin !== "builtin" : skin.favorite)) &&
    skin.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) ?? [], [library, filter, query]);

  const refresh = useCallback(() => {
    const generation = ++loadGeneration.current;
    setError("");
    void getLibrary().then(value => {
      if (!mounted.current || generation !== loadGeneration.current) return;
      setLibrary(value); setSelectedId(value.active_id);
      setModel(value.skins.find(skin => skin.id === value.active_id)?.model ?? "classic");
    }).catch(error => { if (mounted.current && generation === loadGeneration.current) setError(errorMessage(error)); });
  }, []);
  useEffect(() => { mounted.current = true; refresh(); return () => { mounted.current = false; loadGeneration.current++; }; }, [refresh]);
  useEffect(() => { if (adding && method !== "upload") inputRef.current?.focus(); }, [adding, method]);

  const run = useCallback(async (label: string, action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(label); setError(""); setMessage("");
    try { await action(); } catch (error) { if (mounted.current) setError(errorMessage(error)); }
    finally { busyRef.current = false; if (mounted.current) setBusy(""); }
  }, []);
  const accept = useCallback((result: ImportResult) => {
    if (!mounted.current) return;
    setLibrary(result.library);
    if (result.selected_id) {
      setSelectedId(result.selected_id); setModel(result.library.skins.find(skin => skin.id === result.selected_id)?.model ?? "classic");
      setQuery(""); setFilter("all"); setAdding(false); setInput("");
      setMessage("Skin saved to your library. Preview it, then choose Use skin.");
    }
    if (result.errors.length) setError(result.errors.join("\n"));
  }, []);
  const upload = useCallback((paths?: string[]) => void run("Importing skins…", async () => accept(await importFiles(paths))), [run, accept]);
  pendingDrop.current = paths => upload(paths);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview().onDragDropEvent(event => {
      if (disposed) return;
      setDragging(event.payload.type === "enter" || event.payload.type === "over");
      if (event.payload.type === "drop") pendingDrop.current(event.payload.paths);
    }).then(stop => { if (disposed) stop(); else unlisten = stop; }).catch(() => {});
    return () => { disposed = true; unlisten?.(); };
  }, []);

  function closeAdd() { setAdding(false); setInput(""); addButton.current?.focus(); }
  function lookup(event: FormEvent) {
    event.preventDefault();
    void run("Finding skin…", async () => accept(await importPlayer(input)));
  }
  function edit(action: "select" | "favorite" | "remove" | "undo" | "rename", id = selected?.id) {
    if (!id && action !== "undo") return;
    void run(action === "select" ? "Saving selection…" : "Saving library…", async () => {
      const value = await editSkin(id ?? "", action, model, rename ?? undefined);
      if (!mounted.current) return;
      setLibrary(value);
      if (action === "select") setMessage(`${selected?.name} is active in Tachyon.`);
      if (action === "remove") { setSelectedId(value.active_id); setModel(value.skins.find(skin => skin.id === value.active_id)?.model ?? "classic"); setMessage("Skin removed. You can undo this below."); }
      if (action === "undo") setMessage("Skin restored to your library.");
      if (action === "rename") { setRename(null); setMessage("Skin renamed."); }
    });
  }

  return <div className="skins-stage">
    <div className="skins-topbar" data-tauri-drag-region><span>Skins</span><span>Make it yours</span><span className="skins-local-note">Your library · Saved on this device</span></div>
    <ShellViewport expanded={sidebarOpen || adding} scrollable={false}>
      <section className="skins-studio" aria-label="Skin studio" aria-busy={Boolean(busy)}>
        <div className="skins-library">
          <header className="skins-heading"><div><p className="skins-eyebrow">THE DRESSING ROOM</p><h1>A little more you.</h1><p>Familiar faces. Your next identity.</p></div>
            <button ref={addButton} type="button" className="skins-add" aria-expanded={adding} aria-controls="skin-import-panel" onClick={() => { if (adding) closeAdd(); else setAdding(true); }}><Plus size={18} /> Add skin</button>
          </header>
          <AnimatePresence initial={false}>{adding && <motion.section id="skin-import-panel" className="skins-import" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : shellSpring} onKeyDown={event => { if (event.key === "Escape") closeAdd(); }} aria-label="Add a skin">
            <div className="skins-import-inner"><div className="skins-import-methods" aria-label="Import method">
              {([['upload','PNG file',Upload],['player','Player',UserRound],['texture','Texture link',Link]] as const).map(([id,label,Icon]) => <button key={id} type="button" aria-pressed={method === id} onClick={() => { setMethod(id); setInput(""); }}><Icon size={16} />{label}</button>)}
              <button type="button" className="skins-close" aria-label="Close import panel" onClick={closeAdd}><X size={16} /></button>
            </div>
            {method === "upload" ? <div className="skins-file-import"><div><p>Drop your skins anywhere in this window.</p><span>PNG · Classic, slim, legacy &amp; HD · Up to 32 files</span></div><button type="button" disabled={Boolean(busy)} onClick={() => upload()}><Upload size={16} />Choose files</button></div>
              : <form className="skins-lookup" onSubmit={lookup}><label htmlFor="skin-lookup">{method === "player" ? "Java username or player UUID" : "Official Minecraft texture link"}</label><div><input ref={inputRef} id="skin-lookup" value={input} onChange={event => setInput(event.target.value)} autoComplete="off" spellCheck={false} maxLength={256} placeholder={method === "player" ? "e.g. Dinnerbone" : "https://textures.minecraft.net/texture/…"} required /><button type="submit" disabled={Boolean(busy) || !input.trim()}><ArrowUpRight size={17} />Import skin</button></div><p>{method === "player" ? "Imports the player’s current Java skin. Saved skins remain available offline." : "Paste a textures.minecraft.net link. The image is checked before it joins your library."}</p></form>}
            </div>
          </motion.section>}</AnimatePresence>
          <div className="skins-library-toolbar"><div className="skins-filters" aria-label="Library filters">{([['all','All skins'],['custom','Yours'],['favorites','Favorites']] as const).map(([id,label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
            <label className="skins-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search skins</span><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Find a skin…" /></label>
          </div>
          <div className="skins-grid-scroll">
            {!library ? <div className="skins-empty" role="status"><h2>{error ? "Your library couldn’t open" : "Opening your dressing room…"}</h2>{error && <><p>{error}</p><button type="button" onClick={refresh}>Try again</button></>}</div>
              : !visible.length ? <div className="skins-empty"><h2>{query ? "No matching skins" : filter === "favorites" ? "Keep your favorites close." : "Your collection starts here."}</h2><p>{query ? "Try another name or clear the search." : filter === "favorites" ? "Star a skin to find it here." : "Upload a PNG or bring in a player’s skin."}</p><button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Show all skins</button></div>
              : <div className="skins-grid" aria-label="Skin library">{visible.map(skin => <article key={skin.id} className={`skin-tile ${selected?.id === skin.id ? "is-selected" : ""}`}>
                <button type="button" className="skin-tile-select" aria-pressed={selected?.id === skin.id} onClick={() => { setSelectedId(skin.id); setModel(skin.model); setRename(null); }}>
                  <span className="skin-tile-art"><img src={asset(skin.thumbnail)} alt="" width="64" height="64" loading="lazy" decoding="async" /></span>
                  <span className="skin-tile-title">{skin.name}</span><span className="skin-tile-source">{skin.origin === "builtin" ? "Minecraft original" : skin.origin === "player" ? "Player skin" : skin.width > 64 ? "HD skin" : "Your collection"}</span>
                  {skin.id === library.active_id && <span className="skin-tile-active"><Check size={12} /> Active</span>}
                </button>
                <button type="button" className="skin-tile-star" aria-label={`${skin.favorite ? "Unfavorite" : "Favorite"} ${skin.name}`} aria-pressed={skin.favorite} disabled={Boolean(busy)} onClick={() => edit("favorite",skin.id)}><Star size={15} fill={skin.favorite ? "currentColor" : "none"} /></button>
              </article>)}</div>}
          </div>
          <footer className="skins-library-footer"><span>{library ? `${library.skins.length} skins · ${library.skins.filter(skin => skin.origin !== "builtin").length} yours` : "Steve is ready for your first visit."}</span>{library?.can_undo && <button type="button" disabled={Boolean(busy)} onClick={() => edit("undo")}>Undo remove</button>}<span>Drop PNGs to add</span></footer>
        </div>
        <div className="skins-fitting-room">
          <div className="skins-preview-label"><span>THE FITTING ROOM</span><span>LIVE 3D</span></div>
          {selected && <>
            <Suspense fallback={<div className="skins-preview-loading" role="status">Preparing 3D preview…</div>}><SkinPreview skin={selected} model={model} paused={adding} /></Suspense>
            <div className="skins-selection"><div className="skins-selection-heading"><div><p>{selected.origin === "builtin" ? "MINECRAFT ORIGINAL" : selected.origin === "player" ? "PLAYER SKIN" : "YOUR COLLECTION"}</p><h2>{selected.name}</h2></div><span className="skins-resolution">{selected.width} × {selected.height}{selected.height !== selected.width ? " · Legacy" : selected.width > 64 ? " · HD" : ""}</span></div>
              <div className="skins-model" aria-label="Skin model">{([['classic','Classic','4 px arms'],['slim','Slim','3 px arms']] as const).map(([id,label,description]) => <button key={id} type="button" aria-pressed={model === id} onClick={() => setModel(id)}><span>{label}</span><span>{description}</span>{model === id && <Check size={15} />}</button>)}</div>
              <div className="skins-selection-actions"><button type="button" className="skins-use" disabled={Boolean(busy) || active} onClick={() => edit("select")}>{active ? <><Check size={17} />Active in Tachyon</> : "Use skin"}</button><button type="button" className="skins-export" disabled={Boolean(busy)} onClick={() => void run("Exporting skin…", async () => { const path = await exportSkin(selected.id,model); if (path && mounted.current) setMessage("Skin exported as a PNG."); })}><Download size={17} />Export</button>
              {selected.origin !== "builtin" && <><button type="button" aria-label="Rename skin" disabled={Boolean(busy)} onClick={() => setRename(selected.name)}><Pencil size={17} /></button><button type="button" aria-label="Remove skin" disabled={Boolean(busy)} onClick={() => edit("remove")}><Trash2 size={17} /></button></>}</div>
              {rename !== null && <form className="skins-rename" onSubmit={event => { event.preventDefault(); edit("rename"); }}><label className="sr-only" htmlFor="skin-rename">Skin name</label><input id="skin-rename" autoFocus maxLength={48} value={rename} onChange={event => setRename(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setRename(null); }} /><button type="submit" disabled={Boolean(busy) || !rename.trim()}>Save name</button><button type="button" aria-label="Cancel rename" onClick={() => setRename(null)}><X size={16} /></button></form>}
              <p className="skins-account-note">Selection is saved in Tachyon. Minecraft account sync will be available with login.</p>
            </div>
          </>}
        </div>
        {dragging && <div className="skins-drop" role="status"><Upload size={32} /><h2>Make room for a new you.</h2><p>Drop PNG skins to add them to your library.</p></div>}
      </section>
      <div className={`skins-feedback ${error ? "is-error" : ""}`} aria-live={error ? "assertive" : "polite"} aria-atomic="true">{busy || error || message || library?.notice}{(error || message) && !busy && <button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setMessage(""); }}><X size={15} /></button>}</div>
    </ShellViewport>
  </div>;
}
