import { useEffect, useRef, useState } from "react";
import X from "lucide-react/icons/x";
import ZoomIn from "lucide-react/icons/zoom-in";
import ZoomOut from "lucide-react/icons/zoom-out";

export function ImageViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const element = dialog.current!;
    const origin = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); origin?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="project-image-viewer" aria-label={title || "Project image"}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }}>
    <div className="project-image-toolbar"><span>{title || "Project image"}</span><div>
      <button type="button" onClick={() => setZoomed(value => !value)} aria-label={zoomed ? "Fit image" : "View original size"}>{zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}</button>
      <button type="button" onClick={onClose} aria-label="Close image"><X size={20} /></button>
    </div></div>
    <div className={`project-image-canvas${zoomed ? " project-image-original" : ""}`}><img src={src} alt={title} decoding="async" /></div>
  </dialog>;
}
