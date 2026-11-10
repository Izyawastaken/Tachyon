import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FocusEvent,
  type ReactNode,
} from "react";
import { LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { shellSpring } from "./motion";
import { Sidebar } from "@/shell/components/Sidebar";

export interface ShellProps {
  children?: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const reduceMotion = useReducedMotion();
  const focusWithinRef = useRef(false);
  const pointerWithinRef = useRef(false);
  const [activeRoute, setActiveRoute] = useState<string>("home");
  const [open, setOpen] = useState(false);

  const lastCollapseTimeRef = useRef(0);
  const cooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleSidebarMouseEnter = useCallback(() => {
    pointerWithinRef.current = true;
    if (open) return;

    if (cooldownTimerRef.current !== null) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    const timeSinceCollapse = Date.now() - lastCollapseTimeRef.current;
    if (timeSinceCollapse < 140) {
      const delay = Math.max(0, 140 - timeSinceCollapse);
      cooldownTimerRef.current = window.setTimeout(() => {
        setOpen(true);
        cooldownTimerRef.current = null;
      }, delay);
    } else {
      setOpen(true);
    }
  }, [open]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    pointerWithinRef.current = false;
    if (!focusWithinRef.current) {
      setOpen(false);
      lastCollapseTimeRef.current = Date.now();
    }
  }, []);

  const handleFocusCapture = useCallback((event: FocusEvent<HTMLElement>) => {
    focusWithinRef.current = event.target.matches(":focus-visible");
    if (cooldownTimerRef.current !== null) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const handleBlurCapture = useCallback((e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      focusWithinRef.current = false;
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (!pointerWithinRef.current) setOpen(false);
      lastCollapseTimeRef.current = Date.now();
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <LayoutGroup id="shell">
    <div className="tachyon-shell relative flex overflow-hidden text-theme-text select-none py-3 pr-3 pl-0 gap-3">
      <a className="shell-skip-link" href="#workspace">Skip to workspace</a>
      {/* Sidebar Rail / Drawer Region */}
      <motion.aside
        initial={false}
        animate={{ width: open ? 268 : 80 }}
        transition={reduceMotion ? { duration: 0 } : shellSpring}
        className="shell-rail relative z-20 h-full shrink-0 overflow-hidden pl-3"
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (cooldownTimerRef.current !== null) clearTimeout(cooldownTimerRef.current);
            e.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
            setOpen(false);
            lastCollapseTimeRef.current = Date.now();
          }
        }}
      >
        <Sidebar
          open={open}
          setOpen={setOpen}
          activeId={activeRoute}
          onSelect={setActiveRoute}
        />
      </motion.aside>

      {/* Main Viewport Content Container */}
      <motion.main
        id="workspace"
        tabIndex={-1}
        initial={false}
        animate={{ borderRadius: open ? 32 : 24 }}
        transition={reduceMotion ? { duration: 0 } : shellSpring}
        className="shell-viewport relative z-10 flex-1 min-h-0 min-w-0 overflow-hidden"
      >
        <div className="shell-atmosphere" aria-hidden="true">
          <div className="shell-glow" />
          <div className="shell-grain" />
        </div>
        <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </motion.main>
    </div>
    </LayoutGroup>
    </MotionConfig>
  );
}

export default Shell;

