import { motion } from "motion/react";
import { useUpdater } from "@/hooks/useUpdater";
import { cn } from "@/core/lib/utils";
import { controlSpring } from "../motion";

export interface UpdateIndicatorProps {
  open: boolean;
  className?: string;
}

export function UpdateIndicator({ open, className }: UpdateIndicatorProps) {
  const { status, targetVersion, progress, error, downloadAndInstall } = useUpdater({
    autoCheckOnMount: true,
  });

  // Stay absent during the launch check, or if it fails or finds no update.
  // A failed installation retains its known update so the user can retry.
  if (!targetVersion || status === "idle" || status === "checking" || status === "up-to-date") {
    return null;
  }

  const isDownloading = status === "downloading";
  const isDownloaded = status === "downloaded";
  const label = isDownloading
    ? progress?.total ? `Downloading ${progress.percentage}%` : "Downloading…"
    : isDownloaded ? "Update downloaded"
    : status === "error" ? `Retry v${targetVersion}`
    : `Install v${targetVersion}`;

  return (
    <motion.button
      type="button"
      onClick={() => { void downloadAndInstall(); }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={controlSpring}
      aria-label={label}
      aria-busy={isDownloading}
      disabled={isDownloading || isDownloaded}
      title={error ?? label}
      className={cn(
        "relative flex h-10 w-full items-center justify-start gap-3 rounded-button bg-theme-surface px-3 text-left text-theme-text select-none",
        "transition-colors duration-[150ms] ease-out hover:bg-theme-secondary/60 focus-visible:ring-1 focus-visible:ring-theme-text focus-visible:outline-none",
        "cursor-pointer disabled:cursor-default",
        className
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v13m0 0l-4-4m4 4l4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </span>
      <span className={cn(
        "min-w-0 truncate text-sm font-medium transition-opacity duration-[200ms] ease-out",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {label}
      </span>
    </motion.button>
  );
}

export default UpdateIndicator;
