import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import RotateCcw from "lucide-react/icons/rotate-ccw";
import RotateCw from "lucide-react/icons/rotate-cw";
import Layers from "lucide-react/icons/layers";
import type { SkinViewer } from "skinview3d";
import { asset } from "../api";
import type { Skin, SkinModel } from "../types";

const decoded = new Map<string, { promise: Promise<HTMLImageElement>; bytes: number }>();
function texture(url: string) {
  const existing = decoded.get(url);
  if (existing) { decoded.delete(url); decoded.set(url, existing); return existing.promise; }
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  const entry = { promise: image.decode().then(() => { entry.bytes = image.naturalWidth * image.naturalHeight * 4; trim(); return image; }).catch(error => { decoded.delete(url); throw error; }), bytes: 0 };
  decoded.set(url, entry);
  function trim() {
    while (decoded.size > 12 || [...decoded.values()].reduce((sum, item) => sum + item.bytes, 0) > 16 * 1024 * 1024) decoded.delete(decoded.keys().next().value!);
  }
  trim();
  return entry.promise;
}

export default function SkinPreview({ skin, model, paused, moving }: { skin: Skin; model: SkinModel; paused: boolean; moving: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const viewer = useRef<SkinViewer | null>(null);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pose, setPose] = useState<"idle" | "walk" | "still">("idle");
  const [rotate, setRotate] = useState(false);
  const [layers, setLayers] = useState(true);
  const [visible, setVisible] = useState(!document.hidden);
  const animate = useRef(false);
  const resizing = useRef(false);
  const morphing = useRef(moving);
  morphing.current = moving;
  const settleResize = useRef<(() => void) | null>(null);
  const playback = useRef<{ pause(): void; resume(): void } | null>(null);
  const pointer = useRef(false);
  const animations = useRef<typeof import("skinview3d") | null>(null);
  const source = asset(model === "slim" ? skin.slim_texture : skin.texture);
  const render = useCallback(() => {
    const instance = viewer.current;
    if (instance && !instance.disposed && !resizing.current && !morphing.current && !document.hidden && !instance.renderer.getContext().isContextLost()) instance.render();
  }, []);

  useEffect(() => {
    const element = holder.current!;
    let alive = true;
    let instance: SkinViewer | undefined;
    let resize: ResizeObserver | undefined;
    let resizeTimer: number | undefined;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "Interactive 3D skin preview. Drag to rotate, scroll to zoom, or use the view controls.");
    canvas.setAttribute("role", "img");
    element.append(canvas);
    const changed = () => { if (!animate.current) render(); };
    const lost = (event: Event) => { event.preventDefault(); if (alive) { setError("The 3D preview lost its graphics connection. Your skins are still available."); setReady(0); } };
    const down = () => { pointer.current = true; };
    const up = () => { pointer.current = false; };
    resizing.current = false;
    setError(""); setReady(0); setLoading(true);
    void import("skinview3d").then(module => {
      if (!alive) return;
      animations.current = module;
      instance = new module.SkinViewer({ canvas, width: Math.max(1, element.clientWidth), height: Math.max(1, element.clientHeight), pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), renderPaused: true, zoom: 0.82, fov: 42 });
      viewer.current = instance;
      // Keep the last composited frame scaling with the CSS viewport while its
      // drawing buffer stays untouched throughout a shell spring.
      canvas.style.width = "100%"; canvas.style.height = "100%";
      instance.controls.enableDamping = false;
      instance.controls.minDistance = 28;
      instance.controls.maxDistance = 120;
      instance.playerWrapper.rotation.y = -0.35;
      instance.globalLight.intensity = 2.6;
      instance.cameraLight.intensity = 0.7;
      instance.controls.addEventListener("change", changed);
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
      const scheduleResize = () => {
        clearTimeout(resizeTimer);
        // A slow frame is not the end of a spring. Wait for Motion's actual
        // completion signal, including interrupted/reversed sidebar animations.
        if (morphing.current) return;
        resizeTimer = window.setTimeout(() => {
          if (!alive || !instance || instance.disposed || morphing.current) return;
          const { width, height } = element.getBoundingClientRect();
          const w = Math.round(width), h = Math.round(height);
          if (w <= 0 || h <= 0) return;
          // Resizing clears WebGL. Resize and repaint in the same callback.
          if (w !== instance.width || h !== instance.height) instance.setSize(w, h);
          canvas.style.width = "100%"; canvas.style.height = "100%";
          resizing.current = false;
          render();
          playback.current?.resume();
        }, 120);
      };
      settleResize.current = scheduleResize;
      resizing.current = morphing.current;
      resize = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        const w = Math.round(width), h = Math.round(height);
        if (w <= 0 || h <= 0 || !instance || instance.disposed) return;
        if (!resizing.current && w === instance.width && h === instance.height) return;
        resizing.current = true;
        playback.current?.pause();
        scheduleResize();
      });
      resize.observe(element);
      setReady(attempt + 1);
    }).catch(() => { if (alive) setError("3D preview is unavailable on this device. You can still select and export skins."); });
    return () => {
      alive = false; resize?.disconnect(); clearTimeout(resizeTimer); settleResize.current = null;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      instance?.controls.removeEventListener("change", changed);
      if (instance) {
        instance.dispose();
        instance.composer.dispose();
        // The viewer releases textures; geometry/materials also need releasing on route exit.
        const resources = new Set<{ dispose(): void }>();
        instance.scene.traverse(object => {
          const mesh = object as typeof object & { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
          if (mesh.geometry) resources.add(mesh.geometry);
          if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) resources.add(material);
        });
        for (const resource of resources) resource.dispose();
      }
      viewer.current = null; canvas.remove();
    };
  }, [attempt, render]);

  useEffect(() => {
    if (moving) { resizing.current = true; playback.current?.pause(); }
    settleResize.current?.();
  }, [moving]);

  useEffect(() => {
    let intersecting = false;
    const observer = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; setVisible(intersecting && !document.hidden); });
    observer.observe(holder.current!);
    const visibility = () => setVisible(intersecting && !document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    let current = true;
    const instance = viewer.current;
    if (!ready || !instance) return;
    setLoading(true);
    void texture(source).then(image => {
      if (!current || instance.disposed) return;
      instance.loadSkin(image, { model: model === "slim" ? "slim" : "default" });
      render(); setLoading(false); setError("");
    }).catch(() => { if (current) { instance.loadSkin(null); setError("This skin texture could not load. Import the PNG again to repair it."); } });
    return () => { current = false; };
  }, [source, model, ready, render]);

  useEffect(() => {
    const instance = viewer.current;
    const module = animations.current;
    if (!ready || !instance || !module) return;
    instance.animation = reduced || pose === "still" ? null : pose === "walk" ? new module.WalkingAnimation() : new module.IdleAnimation();
    if (instance.animation) instance.animation.speed = pose === "walk" ? 0.8 : 0.65;
  }, [ready, pose, reduced]);

  useEffect(() => {
    const instance = viewer.current;
    if (!ready || !instance) return;
    instance.playerObject.skin.setOuterLayerVisible(layers);
    const running = !reduced && visible && !paused && !error && (pose !== "still" || rotate);
    let frame = 0;
    let previous = 0;
    let deadline = 0;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      // Cap work at 60 Hz on high-refresh displays, without accumulating hidden-tab time.
      if (time < deadline) return;
      const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      const interval = 1000 / 60;
      deadline = time + interval - ((time - deadline) % interval);
      instance.animation?.update(instance.playerObject, delta);
      if (rotate && !pointer.current) instance.playerWrapper.rotation.y += delta * 0.35;
      instance.controls.update(); instance.render();
    };
    const pause = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; deadline = 0; animate.current = false; };
    const resume = () => {
      if (running && !resizing.current && !morphing.current && !frame) { animate.current = true; frame = requestAnimationFrame(draw); }
    };
    playback.current = { pause, resume };
    resume();
    if (!running && !error) render();
    return () => { pause(); playback.current = null; };
  }, [ready, pose, rotate, layers, reduced, visible, paused, error, render]);

  const turn = useCallback((amount: number) => { const instance = viewer.current; if (instance) { instance.playerWrapper.rotation.y += amount; render(); } }, [render]);
  const reset = useCallback(() => { const instance = viewer.current; if (instance) { instance.resetCameraPose(); instance.zoom = 0.82; instance.playerWrapper.rotation.y = -0.35; render(); } }, [render]);
  return <div className="skin-preview">
    <div className="skin-preview-scene" ref={holder} />
    <div className="skin-orbit" aria-hidden="true"><i /><i /><i /></div>
    {loading && !error && <span className="skin-preview-status" role="status">Preparing preview…</span>}
    {error && <div className="skin-preview-fallback" role="status"><img src={asset(skin.thumbnail)} alt="" /><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry 3D preview</button></div>}
    <div className="skin-view-controls" aria-label="3D preview controls">
      <button type="button" onClick={() => turn(-Math.PI / 4)} disabled={!ready} aria-label="Rotate skin left"><RotateCcw size={17} /></button>
      <button type="button" onClick={() => turn(Math.PI / 4)} disabled={!ready} aria-label="Rotate skin right"><RotateCw size={17} /></button>
      <span aria-hidden="true" />
      <label className="skin-pose"><span className="sr-only">Preview animation</span><select value={pose} onChange={event => setPose(event.target.value as typeof pose)} disabled={!ready || Boolean(reduced)}><option value="idle">Idle</option><option value="walk">Walk</option><option value="still">Still</option></select></label>
      <button type="button" onClick={() => setRotate(value => !value)} disabled={!ready || Boolean(reduced)} aria-pressed={rotate} aria-label="Auto rotate"><RotateCw size={17} /></button>
      <button type="button" onClick={() => setLayers(value => !value)} disabled={!ready} aria-pressed={layers} aria-label="Show outer skin layer"><Layers size={17} /></button>
      <button type="button" onClick={reset} disabled={!ready}>Reset</button>
    </div>
    <p className="skin-preview-hint">Drag to rotate · Scroll to zoom</p>
  </div>;
}
