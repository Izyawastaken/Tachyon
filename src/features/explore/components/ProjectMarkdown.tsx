import { useEffect, useRef } from "react";
import { localImage } from "../api";

export function ProjectMarkdown({ html, onImage }: { html: string; onImage: (src: string, title: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const image = entry.target as HTMLImageElement;
        void localImage(image.dataset.imageUrl!).then(src => {
          if (!active) return;
          image.src = src;
          image.dataset.ready = "true";
          image.tabIndex = 0;
          image.setAttribute("role", "button");
          image.setAttribute("aria-label", `Enlarge ${image.alt || "project image"}`);
        }).catch(() => { if (active) image.dataset.failed = "true"; });
      }
    }, { rootMargin: "200px" });
    root.current?.querySelectorAll<HTMLImageElement>("img[data-image-url]").forEach(image => {
      image.decoding = "async";
      image.addEventListener("error", () => { image.dataset.failed = "true"; }, { once: true });
      observer.observe(image);
    });
    return () => { active = false; observer.disconnect(); };
  }, [html]);
  return <div ref={root} className="project-markdown"
    onClick={event => {
      if (event.target instanceof HTMLImageElement && event.target.dataset.ready) {
        event.preventDefault(); event.stopPropagation(); onImage(event.target.src, event.target.alt);
      }
    }}
    onKeyDown={event => {
      if ((event.key === "Enter" || event.key === " ") && event.target instanceof HTMLImageElement && event.target.dataset.ready) {
        event.preventDefault(); event.stopPropagation(); onImage(event.target.src, event.target.alt);
      }
    }} dangerouslySetInnerHTML={{ __html: html }} />;
}
