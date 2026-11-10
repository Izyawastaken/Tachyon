import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FocusEvent,
  type ReactNode,
} from "react";
import { cn } from "@/core/lib/utils";
import { Sidebar } from "@/shell/components/Sidebar";

export interface ShellProps {
  children?: ReactNode;
}

export function Shell({ children }: ShellProps) {
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
    if (open) return;

    if (cooldownTimerRef.current !== null) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    const timeSinceCollapse = Date.now() - lastCollapseTimeRef.current;
    if (timeSinceCollapse < 300) {
      const delay = Math.max(0, 300 - timeSinceCollapse);
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

    setOpen(false);
    lastCollapseTimeRef.current = Date.now();
  }, []);

  const handleFocusCapture = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const handleBlurCapture = useCallback((e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      setOpen(false);
      lastCollapseTimeRef.current = Date.now();
    }
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-theme-background text-theme-text select-none py-3 pr-3 pl-0 gap-3">
      {/* Sidebar Rail / Drawer Region */}
      <aside
        style={{ width: open ? 252 : 80 }}
        className={cn(
          "relative z-20 h-full shrink-0 bg-theme-background overflow-hidden pl-3",
          "transition-[width] duration-[250ms] ease-out motion-reduce:transition-none"
        )}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <Sidebar
          open={open}
          setOpen={setOpen}
          activeId={activeRoute}
          onSelect={setActiveRoute}
        />
      </aside>

      {/* Main Viewport Content Container */}
      <main className="relative z-10 flex-1 min-h-0 w-full overflow-hidden bg-theme-background/60 rounded-container border border-theme-border backdrop-blur-md">
        <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Shell;
