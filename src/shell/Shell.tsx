import {
  Activity,
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
import { RouteBoundary } from "./components/RouteBoundary";
import { Sidebar } from "@/shell/components/Sidebar";
import { useAuth } from "@/features/auth/useAuth";
import type { AuthClient } from "@/features/auth/api";
import type { SettingsNavigation } from "@/features/settings/navigation";

const HomePage = lazy(() => import("@/features/home/HomePage"));
const LibraryPage = lazy(() => import("@/features/library/LibraryPage"));
const ExplorePage = lazy(() => import("@/features/explore/ExplorePage"));
const SkinsPage = lazy(() => import("@/features/skins/SkinsPage"));
const ScreenshotsPage = lazy(() => import("@/features/screenshots/ScreenshotsPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const Spotlight = lazy(() => import("./components/Spotlight"));

export interface ShellProps {
  children?: ReactNode;
  authClient?: AuthClient;
}

export function Shell({ children, authClient }: ShellProps) {
  const auth = useAuth(authClient);
  const reduceMotion = useReducedMotion();
  const focusWithinRef = useRef(false);
  const pointerWithinRef = useRef(false);
  const [activeRoute, setActiveRoute] = useState<string>("home");
  const [libraryOpened, setLibraryOpened] = useState(false);
  const [open, setOpen] = useState(false);
  const [sidebarMoving, setSidebarMoving] = useState(false);
  const [spotlight, setSpotlight] = useState<{ open: boolean; search: string } | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<SettingsNavigation | null>(null);
  const settingsRequest = useRef(0);
  const openSpotlight = useCallback((search = '') => setSpotlight({ open: true, search }), []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const mac = /Mac|iPhone|iPad/.test(navigator.platform);
      const modifier = mac ? event.altKey && !event.ctrlKey && !event.metaKey : event.ctrlKey && !event.altKey && !event.metaKey;
      if ((event.code !== 'Space' && event.key !== ' ') || !modifier || event.shiftKey || event.repeat || event.isComposing) return;
      event.preventDefault();
      if (document.querySelector('dialog[open]:not(.spotlight-dialog), [role="dialog"][aria-modal="true"]')) return;
      setSpotlight(current => current?.open ? { ...current, open: false } : { open: true, search: '' });
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

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
        onAnimationStart={() => setSidebarMoving(true)}
        onAnimationComplete={() => setSidebarMoving(false)}
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
          onSelect={route => {
            if (route === "search") { openSpotlight(); return; }
            setSettingsTarget(null);
            if (route === "library") setLibraryOpened(true);
            setActiveRoute(route);
          }}
          accountName={auth.session?.profile.name}
        />
      </motion.aside>

      <div className="shell-stage">
        {libraryOpened && <Activity mode={activeRoute === "library" ? "visible" : "hidden"}>
          <RouteBoundary fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="alert">Library could not load.</p></ShellViewport>}>
            <Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Library…</p></ShellViewport>}>
              <LibraryPage sidebarOpen={open} active={activeRoute === "library"} />
            </Suspense>
          </RouteBoundary>
        </Activity>}
        {activeRoute === "settings" ? <RouteBoundary fallback={<ShellViewport expanded={open}><div className="shell-route-loading" role="alert"><p>Settings could not load.</p><button type="button" onClick={() => window.location.reload()}>Reload Tachyon</button></div></ShellViewport>}><Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Settings…</p></ShellViewport>}><SettingsPage sidebarOpen={open} navigationTarget={settingsTarget} onOpenSpotlight={openSpotlight} /></Suspense></RouteBoundary> : activeRoute === "login" ? <RouteBoundary fallback={<ShellViewport expanded={open}><div className="shell-route-loading" role="alert"><p>Account could not load.</p><button type="button" onClick={() => window.location.reload()}>Reload Tachyon</button></div></ShellViewport>}><Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Account…</p></ShellViewport>}><LoginPage sidebarOpen={open} auth={auth} onHome={() => setActiveRoute("home")} /></Suspense></RouteBoundary> : <>
        {activeRoute === "home" ? <RouteBoundary fallback={<ShellViewport expanded={open}><div className="shell-route-loading" role="alert"><p>Home could not load.</p><button type="button" onClick={() => window.location.reload()}>Reload Tachyon</button></div></ShellViewport>}><Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Home…</p></ShellViewport>}><HomePage sidebarOpen={open} onExplore={() => setActiveRoute("explore")} /></Suspense></RouteBoundary> : activeRoute === "library" ? null : activeRoute === "explore" ? <RouteBoundary fallback={<ShellViewport expanded={open}><div className="shell-route-loading" role="alert"><p>Explore could not load.</p><button type="button" onClick={() => window.location.reload()}>Reload Tachyon</button></div></ShellViewport>}><Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Explore…</p></ShellViewport>}>
          <ExplorePage sidebarOpen={open} />
        </Suspense></RouteBoundary> : activeRoute === "skins" ? <RouteBoundary fallback={<ShellViewport expanded={open}><div className="shell-route-loading" role="alert"><p>Skins could not load.</p><button type="button" onClick={() => window.location.reload()}>Reload Tachyon</button></div></ShellViewport>}><Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Skins…</p></ShellViewport>}><SkinsPage sidebarOpen={open} sidebarMoving={sidebarMoving} /></Suspense></RouteBoundary> : activeRoute === "screenshots" ? <RouteBoundary fallback={<ShellViewport expanded={open}><div className="shell-route-loading" role="alert"><p>Screenshots could not load.</p><button type="button" onClick={() => window.location.reload()}>Reload Tachyon</button></div></ShellViewport>}><Suspense fallback={<ShellViewport expanded={open}><p className="shell-route-loading" role="status">Opening Screenshots…</p></ShellViewport>}><ScreenshotsPage sidebarOpen={open} /></Suspense></RouteBoundary> : <ShellViewport expanded={open}>{children}</ShellViewport>}
        </>}
      </div>
      {spotlight && <Suspense fallback={null}><Spotlight open={spotlight.open} initialSearch={spotlight.search} onOpenChange={next => setSpotlight(current => current ? { ...current, open: next } : null)} onSelect={selection => {
        if (selection.kind === 'settings') {
          setSettingsTarget({ ...selection.destination, requestId: ++settingsRequest.current });
          setActiveRoute('settings');
        } else {
          setSettingsTarget(null);
          if (selection.route === 'library') setLibraryOpened(true);
          setActiveRoute(selection.route);
        }
      }} /></Suspense>}
    </div>
    </LayoutGroup>
    </MotionConfig>
  );
}

export default Shell;

