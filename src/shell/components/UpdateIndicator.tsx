import { useUpdater } from "@/hooks/useUpdater";
import { cn } from "@/core/lib/utils";

export interface UpdateIndicatorProps {
  open: boolean;
  className?: string;
}

export function UpdateIndicator({ open, className }: UpdateIndicatorProps) {
  const {
    status,
    currentVersion,
    targetVersion,
    progress,
    checkForUpdates,
    downloadAndInstall,
  } = useUpdater({ autoCheckOnMount: true });

  const handleClick = () => {
    if (status === "available") {
      downloadAndInstall();
    } else if (status !== "checking" && status !== "downloading") {
      checkForUpdates(false);
    }
  };

  const isAvailable = status === "available";
  const isDownloading = status === "downloading";
  const isChecking = status === "checking";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        isAvailable
          ? `Update available: v${targetVersion}. Click to install.`
          : isChecking
          ? "Checking for updates"
          : `Tachyon v${currentVersion}`
      }
      disabled={isDownloading}
      className={cn(
        "group relative flex items-center h-10 w-full rounded-button transition-all duration-[150ms] ease-out cursor-pointer text-left select-none justify-start px-3 gap-3 active:scale-pressed hover:scale-hover focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:outline-none",
        isAvailable
          ? "bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 shadow-xs"
          : "text-theme-text/60 hover:text-theme-text hover:bg-theme-secondary/20 font-normal",
        className
      )}
      title={
        isAvailable
          ? `Update v${targetVersion} available - Click to install`
          : `Tachyon v${currentVersion} (Click to check updates)`
      }
    >
      {/* Icon with status dot */}
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center pointer-events-none">
        {isChecking ? (
          <svg
            className="animate-spin text-sky-400"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : isAvailable ? (
          <svg
            className="text-sky-400 animate-bounce"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v13m0 0l-4-4m4 4l4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        ) : (
          <svg
            className={cn(
              "transition-colors duration-[150ms]",
              status === "up-to-date" ? "text-emerald-400/80" : "text-theme-text/60 group-hover:text-theme-text"
            )}
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
        )}

        {/* Micro status badge in collapsed mode */}
        {isAvailable && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-400 ring-2 ring-theme-background" />
        )}
      </div>

      {/* Expanded Label */}
      <div
        className={cn(
          "flex flex-col min-w-0 transition-opacity duration-[200ms] ease-out truncate",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <span className="text-xs font-medium truncate">
          {isChecking && "Checking updates..."}
          {isDownloading && `Downloading (${progress?.percentage ?? 0}%)`}
          {isAvailable && `Install v${targetVersion}`}
          {status === "up-to-date" && `Tachyon v${currentVersion}`}
          {status === "idle" && `v${currentVersion}`}
          {status === "error" && `v${currentVersion} • Retry`}
        </span>
        {open && isAvailable && (
          <span className="text-[10px] text-sky-400/80 font-normal truncate">
            Click to install
          </span>
        )}
      </div>
    </button>
  );
}

export default UpdateIndicator;
