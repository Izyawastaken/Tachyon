import { useEffect, useRef, useState } from "react";
import { localImage } from "../api";

export function ProjectImage({ url, title, gallery = false }: { url: string | null; title: string; gallery?: boolean }) {
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
  return <span ref={ref} className={gallery ? "project-gallery-image" : "project-icon"}>
    {!failed && source && source.url === url
      ? <img src={source.src} alt={gallery ? title : ""} decoding="async" onError={() => setFailed(true)} />
      : <span aria-hidden="true">{gallery ? "" : title.slice(0, 1).toUpperCase()}</span>}
  </span>;
}
