import {
  useState,
  lazy,
  Suspense,
  useRef,
  useCallback,
  useEffect,
  type FocusEvent,
  type ReactNode,
} from "react";
import { LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { shellSpring } from "./motion";
import { ShellViewport } from "./components/ShellViewport";
import { Sidebar } from "@/shell/components/Sidebar";

const ExplorePage = lazy(() => import("@/features/explore/ExplorePage"));

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

      <div className="shell-stage">
        {activeRoute === "explore" ? <Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Explore…</p></ShellViewport>}>
          <ExplorePage sidebarOpen={open} />
        </Suspense> : <ShellViewport expanded={open}>{children}</ShellViewport>}
      </div>
    </div>
    </LayoutGroup>
    </MotionConfig>
  );
}

export default Shell;

