import { useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

export function useHoverDrawer() {
  const [hovered, setHovered] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [pinned, setPinned] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const open = hovered || keyboard || pinned;
  const close = () => { setHovered(false); setKeyboard(false); setPinned(false); };
  return {
    open, pinned, toggleRef, close,
    toggle: () => setPinned(value => !value),
    handlers: {
      onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== "touch") setHovered(true); },
      onPointerLeave: () => setHovered(false),
      onFocusCapture: (event: FocusEvent<HTMLElement>) => { if (event.target.matches(":focus-visible")) setKeyboard(true); },
      onBlurCapture: (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboard(false); },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") { event.stopPropagation(); toggleRef.current?.focus(); close(); }
      },
    },
  };
}
