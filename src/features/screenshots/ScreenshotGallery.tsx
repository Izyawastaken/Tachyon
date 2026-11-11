import { memo, useLayoutEffect, useRef, useState } from "react";
import Masonry, { type MasonryItem } from "@/components/Masonry";

export const ScreenshotGallery = memo(function ScreenshotGallery({ items, onLightboxChange }: {
  items: MasonryItem[];
  onLightboxChange: (open: boolean) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    let referenceWidth = 0;
    let availableWidth = viewport.clientWidth;
    let canvasHeight = 0;

    const scale = () => {
      if (!referenceWidth) return;
      const ratio = availableWidth / referenceWidth;
      canvas.style.transform = `scale(${ratio})`;
      viewport.style.height = `${canvasHeight * ratio}px`;
    };
    const reflow = () => {
      availableWidth = viewport.clientWidth;
      // Measure the space with both panels collapsed, including their current
      // animated widths. Panel motion then changes only the canvas transform.
      const shell = viewport.closest(".tachyon-shell");
      const rail = shell?.querySelector(".shell-rail")?.getBoundingClientRect().width ?? 80;
      const drawer = viewport.closest(".screenshots-stage")?.querySelector(".screenshots-filter-drawer")?.getBoundingClientRect().width ?? 48;
      referenceWidth = Math.max(1, Math.min(1800, Math.round(availableWidth + Math.max(0, rail - 80) + Math.max(0, drawer - 48))));
      canvas.style.width = `${referenceWidth}px`;
      setLayoutWidth(referenceWidth);
      scale();
    };
    reflow();
    const viewportObserver = new ResizeObserver(([entry]) => {
      if (availableWidth === entry.contentRect.width) return;
      availableWidth = entry.contentRect.width;
      scale();
    });
    const canvasObserver = new ResizeObserver(([entry]) => {
      canvasHeight = entry.contentRect.height;
      scale();
    });
    viewportObserver.observe(viewport);
    canvasObserver.observe(canvas);
    window.addEventListener("resize", reflow);
    return () => {
      viewportObserver.disconnect();
      canvasObserver.disconnect();
      window.removeEventListener("resize", reflow);
    };
  }, []);

  return <div ref={viewportRef} className="screenshots-gallery">
    <div ref={canvasRef} className="screenshots-gallery-canvas">
      {layoutWidth > 0 && <Masonry items={items} columnWidth={260} gap={16} radius={16}
        animateFrom="random" stagger={0.035} duration={0.8} bounce={0.06} blurToFocus
        revealOnScroll hoverEffect="zoom" focusOnHover={false} captions="hover" parallax={0}
        lightbox onLightboxChange={onLightboxChange} draggable={false} className="screenshots-masonry" />}
    </div>
  </div>;
});
