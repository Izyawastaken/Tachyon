import {
  useState,
  useEffect,
  type ComponentType,
  type MouseEvent,
} from "react";
import {
  BoxesIcon,
  SearchIcon,
  HouseIcon,
  CompassIcon,
  BookshelfIcon,
  PaletteIcon,
  CameraIcon,
  FolderIcon,
  PlusIcon,
  ChevronRightIcon,
  SettingsIcon,
  LogInIcon,
  useIconHover,
} from "@/core/components/ui/icons";
import { cn } from "@/core/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<any>;
}

export interface InstanceItem {
  id: string;
  name: string;
  version?: string;
}

export interface SidebarProps {
  open: boolean;
  setOpen?: (open: boolean) => void;
  activeId?: string;
  onSelect?: (id: string) => void;
  onLoginClick?: () => void;
  className?: string;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "explore", label: "Explore", icon: CompassIcon },
  { id: "library", label: "Library", icon: BookshelfIcon },
  { id: "skins", label: "Skins", icon: PaletteIcon },
  { id: "screenshots", label: "Screenshots", icon: CameraIcon },
];

export const INITIAL_INSTANCES: readonly InstanceItem[] = [
  { id: "vanilla", name: "Vanilla 1.21.4", version: "1.21.4" },
  { id: "modded", name: "Create & Magic", version: "1.20.1" },
  { id: "hypixel", name: "Hypixel & Mini", version: "1.8.9" },
  { id: "survival", name: "Hardcore SMP", version: "1.21.1" },
];

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  open: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, open, onClick }: NavButtonProps) {
  const { ref, triggerProps } = useIconHover();
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      {...triggerProps}
      className={cn(
        "relative flex items-center h-10 w-full rounded-button transition-colors duration-[150ms] ease-out cursor-pointer text-left select-none justify-start px-3 gap-3 active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none",
        isActive
          ? "bg-theme-surface text-theme-text font-medium shadow-sm"
          : "text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 font-normal"
      )}
      title={item.label}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center pointer-events-none">
        <Icon
          ref={ref}
          size={18}
          className={cn(
            "transition-colors duration-[150ms] ease-out",
            isActive ? "text-theme-text" : "text-theme-text/60"
          )}
        />
      </div>

      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-xs transition-opacity duration-[200ms] ease-out truncate",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

interface InstanceRowProps {
  inst: InstanceItem;
  isSelected: boolean;
  open: boolean;
  onClick: () => void;
}

function InstanceRow({ inst, isSelected, open, onClick }: InstanceRowProps) {
  const { ref, triggerProps } = useIconHover();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${inst.name}${inst.version ? ` (${inst.version})` : ""}`}
      aria-current={isSelected ? "true" : undefined}
      {...triggerProps}
      className={cn(
        "flex items-center h-[34px] w-full rounded-control transition-colors duration-[150ms] ease-out cursor-pointer text-left select-none justify-start px-3 gap-2.5 active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none",
        isSelected
          ? "bg-theme-surface/70 text-theme-text font-medium shadow-xs"
          : "text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 font-normal"
      )}
      title={inst.name}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center pointer-events-none">
        <FolderIcon
          ref={ref}
          size={15}
          className={cn(
            "transition-colors duration-[150ms] ease-out",
            isSelected ? "text-theme-primary" : "text-theme-text/50"
          )}
        />
      </div>

      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-[11px] transition-opacity duration-[200ms] ease-out truncate",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {inst.name}
      </span>

      {open && inst.version && (
        <span
          className="ml-auto font-mono text-[9px] text-theme-text/40 transition-opacity duration-[200ms] ease-out shrink-0"
        >
          {inst.version}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  open,
  setOpen,
  activeId: externalActiveId,
  onSelect,
  onLoginClick,
  className,
}: SidebarProps) {
  const [internalActiveId, setInternalActiveId] = useState<string>("home");
  const activeId = externalActiveId ?? internalActiveId;

  const [instances, setInstances] = useState<InstanceItem[]>([
    ...INITIAL_INSTANCES,
  ]);
  const [activeInstanceId, setActiveInstanceId] = useState<string>("vanilla");

  const brandHover = useIconHover();
  const searchHover = useIconHover();
  const addHover = useIconHover();
  const settingsHover = useIconHover();
  const loginHover = useIconHover();

  useEffect(() => {
    if (!externalActiveId) return;

    const cleanInstId = externalActiveId.startsWith("instance-")
      ? externalActiveId.replace("instance-", "")
      : externalActiveId;

    if (instances.some((i) => i.id === cleanInstId)) {
      setActiveInstanceId(cleanInstId);
    }
  }, [externalActiveId, instances]);

  const handleSelect = (id: string) => {
    setInternalActiveId(id);
    if (id.startsWith("instance-")) {
      setActiveInstanceId(id.replace("instance-", ""));
    } else if (instances.some((i) => i.id === id)) {
      setActiveInstanceId(id);
    }
    onSelect?.(id);
  };

  const handleBrandClick = () => {
    if (setOpen && !open) {
      setOpen(true);
    }
    handleSelect("home");
  };

  const handleAddInstance = (e: MouseEvent) => {
    e.stopPropagation();
    const newId = `inst-${Date.now()}`;
    const newInst: InstanceItem = {
      id: newId,
      name: `New World ${instances.length + 1}`,
      version: "1.21.4",
    };
    setInstances((prev) => [...prev, newInst]);
    setActiveInstanceId(newId);
    handleSelect(newId);
  };

  const isInstanceSelected = (instId: string) => {
    if (activeId === instId || activeId === `instance-${instId}`) {
      return true;
    }
    const isOtherSection =
      PRIMARY_NAV_ITEMS.some((i) => i.id !== "home" && i.id === activeId) ||
      activeId === "settings" ||
      activeId === "login" ||
      activeId === "search";

    if (!isOtherSection && activeInstanceId === instId) {
      return true;
    }
    return false;
  };

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "relative flex h-full w-full flex-col justify-between select-none bg-transparent overflow-hidden text-theme-text",
        className
      )}
    >
      {/* Top Section */}
      <div className="px-3 pt-2.5 flex flex-col gap-3 min-h-0 flex-1">
        {/* Brand Header (height: 40px) */}
        <div className="relative flex items-center h-10 w-full overflow-hidden">
          <button
            type="button"
            onClick={handleBrandClick}
            aria-label="Tachyon"
            {...brandHover.triggerProps}
            className="group flex items-center gap-3 min-w-0 cursor-pointer text-left rounded-button focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none ml-0.5"
            title="Tachyon"
          >
            {/* App icon badge: 40x40px rounded-button (12px), centered at rail when collapsed */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-theme-surface text-theme-text shadow-sm transition-all duration-[150ms] ease-out group-hover:scale-hover group-active:scale-pressed pointer-events-none">
              <BoxesIcon
                ref={brandHover.ref}
                size={20}
                className="text-theme-text"
              />
            </div>

            {/* App name */}
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight text-theme-text transition-opacity duration-[200ms] ease-out truncate",
                open ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              Tachyon
            </span>
          </button>

          {/* Search button: 32x32px rounded-control (8px) */}
          <button
            type="button"
            onClick={() => handleSelect("search")}
            aria-label="Quick search"
            aria-hidden={!open ? true : undefined}
            aria-current={activeId === "search" ? "page" : undefined}
            {...searchHover.triggerProps}
            className={cn(
              "absolute right-0 top-1 flex h-8 w-8 items-center justify-center rounded-control text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 transition-all duration-[150ms] ease-out shrink-0 cursor-pointer active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none",
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            title="Search"
            tabIndex={open ? 0 : -1}
          >
            <SearchIcon
              ref={searchHover.ref}
              size={16}
              className="pointer-events-none"
            />
          </button>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex flex-col gap-1.5" aria-label="Primary Navigation">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isHome = item.id === "home";
            const isHomeActive =
              activeId === "home" ||
              activeId.startsWith("instance-") ||
              instances.some((i) => i.id === activeId);

            const isActive = isHome ? isHomeActive : activeId === item.id;

            return (
              <NavButton
                key={item.id}
                item={item}
                isActive={isActive}
                open={open}
                onClick={() => handleSelect(item.id)}
              />
            );
          })}
        </nav>

        {/* Instances Section */}
        <div className="flex flex-col gap-1 min-h-0 flex-1 mt-1">
          {/* Header */}
          <div
            className={cn(
              "flex items-center h-6 w-full overflow-hidden transition-all duration-[150ms] ease-out",
              open ? "justify-between px-2" : "justify-center px-0"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold text-theme-text/60 transition-opacity duration-[200ms] ease-out",
                open ? "opacity-100" : "hidden"
              )}
            >
              <span className="truncate">Instances</span>
              <ChevronRightIcon
                size={12}
                className="text-theme-text/40 pointer-events-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddInstance}
              aria-label="Add instance"
              {...addHover.triggerProps}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 transition-all duration-[150ms] ease-out cursor-pointer active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none"
              title="Add Instance"
            >
              <PlusIcon
                ref={addHover.ref}
                size={14}
                className="pointer-events-none"
              />
            </button>
          </div>

          {/* Instances List */}
          <div className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {instances.map((inst) => (
              <InstanceRow
                key={inst.id}
                inst={inst}
                isSelected={isInstanceSelected(inst.id)}
                open={open}
                onClick={() => {
                  setActiveInstanceId(inst.id);
                  handleSelect(inst.id);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section (pinned at bottom pb-2.5 px-3 flex flex-col gap-1.5) */}
      <div className="pb-2.5 px-3 flex flex-col gap-1.5 shrink-0">
        {/* Settings */}
        <button
          type="button"
          onClick={() => handleSelect("settings")}
          aria-label="Settings"
          aria-current={activeId === "settings" ? "page" : undefined}
          {...settingsHover.triggerProps}
          className={cn(
            "relative flex items-center h-10 w-full rounded-button transition-colors duration-[150ms] ease-out cursor-pointer text-left select-none justify-start px-3 gap-3 active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none",
            activeId === "settings"
              ? "bg-theme-surface text-theme-text font-medium shadow-sm"
              : "text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 font-normal"
          )}
          title="Settings"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center pointer-events-none">
            <SettingsIcon
              ref={settingsHover.ref}
              size={18}
              className={cn(
                "transition-colors duration-[150ms] ease-out",
                activeId === "settings"
                  ? "text-theme-text"
                  : "text-theme-text/60"
              )}
            />
          </div>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-xs transition-opacity duration-[200ms] ease-out truncate",
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            Settings
          </span>
        </button>

        {/* Login */}
        <button
          type="button"
          onClick={() => {
            handleSelect("login");
            onLoginClick?.();
          }}
          aria-label="Login"
          aria-current={activeId === "login" ? "page" : undefined}
          {...loginHover.triggerProps}
          className={cn(
            "relative flex items-center h-10 w-full rounded-button transition-colors duration-[150ms] ease-out cursor-pointer text-left select-none justify-start px-3 gap-3 active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none",
            activeId === "login"
              ? "bg-theme-surface text-theme-text font-medium shadow-sm"
              : "text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 font-normal"
          )}
          title="Login"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center pointer-events-none">
            <LogInIcon
              ref={loginHover.ref}
              size={18}
              className={cn(
                "transition-colors duration-[150ms] ease-out",
                activeId === "login" ? "text-theme-text" : "text-theme-text/60"
              )}
            />
          </div>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-xs transition-opacity duration-[200ms] ease-out truncate",
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            Login
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
