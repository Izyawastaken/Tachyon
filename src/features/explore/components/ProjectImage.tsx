import { useEffect, useRef, useState } from "react";
import { localImage } from "../api";

export function ProjectImage({ url, title, gallery = false, onOpen }: { url: string | null; title: string; gallery?: boolean; onOpen?: (src: string, title: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [source, setSource] = useState<{ url: string; src: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!url || !ref.current) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void localImage(url).then(src => { if (active) setSource({ url, src }); }).catch(() => { if (active) setFailed(true); });
    }, { rootMargin: "120px" });
    observer.observe(ref.current);
    return () => { active = false; observer.disconnect(); };
  }, [url]);
  const ready = !failed && source?.url === url ? source : null;
  return <span ref={ref} className={gallery ? "project-gallery-image" : "project-icon"}
    data-ready={Boolean(ready)}
    role={gallery && ready ? "button" : undefined} tabIndex={gallery && ready ? 0 : undefined}
    aria-label={gallery ? `Enlarge ${title}` : undefined}
    onClick={() => { if (gallery && ready) onOpen?.(ready.src, title); }}
    onKeyDown={event => { if (gallery && ready && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen?.(ready.src, title); } }}>
    {!failed && source && source.url === url
      ? <img src={source.src} alt={gallery ? title : ""} decoding="async" onError={() => setFailed(true)} />
      : <span aria-hidden="true">{gallery ? (failed ? "Image unavailable" : "") : title.slice(0, 1).toUpperCase()}</span>}
  </span>;
}
