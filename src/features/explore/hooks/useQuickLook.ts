import { useCallback, useEffect, useRef, useState } from "react";

export function useQuickLook(identity: string, enabled: boolean) {
  const [quickId, setQuickId] = useState<string | null>(null);
  const hovered = useRef<string | null>(null);
  const held = useRef(false);
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    if (dwell.current !== null) clearTimeout(dwell.current);
    dwell.current = null;
    held.current = false;
    setQuickId(null);
  }, []);
  const hover = useCallback((id: string | null) => { if (!held.current) hovered.current = id; }, []);

  useEffect(() => {
    clear();
    hovered.current = null;
    if (!enabled) return;
    const down = (event: KeyboardEvent) => {
      if (event.code === "Escape") { clear(); return; }
      if (event.code !== "Space" || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest("input,textarea,select,[contenteditable='true'],[role='textbox']")) return;
      const card = element?.closest<HTMLElement>("[data-project-card]");
      if (element?.closest("button,a") && !card && (!hovered.current || element.matches(":focus-visible"))) return;
      const id = hovered.current ?? card?.dataset.projectCard;
      if (!id) return;
      event.preventDefault();
      held.current = true;
      // A short deliberate hold distinguishes Quick Look from ordinary keyboard activation.
      dwell.current = setTimeout(() => { if (held.current) setQuickId(id); }, 180);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space" && held.current) { event.preventDefault(); clear(); }
      if (event.code === "Escape") clear();
    };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
      if (dwell.current !== null) clearTimeout(dwell.current);
      held.current = false;
    };
  }, [identity, enabled, clear]);
  return { quickId, hover, clear };
}
