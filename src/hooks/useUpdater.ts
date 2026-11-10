import { useState, useEffect, useCallback, useRef } from "react";
import { check, type Update, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "downloaded"
  | "error";

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export interface UseUpdaterOptions {
  autoCheckOnMount?: boolean;
}

export interface UseUpdaterReturn {
  status: UpdaterStatus;
  update: Update | null;
  currentVersion: string;
  targetVersion: string | null;
  progress: DownloadProgress | null;
  error: string | null;
  checkForUpdates: (silent?: boolean) => Promise<Update | null>;
  downloadAndInstall: () => Promise<void>;
  reset: () => void;
}

export function useUpdater(options: UseUpdaterOptions = {}): UseUpdaterReturn {
  const { autoCheckOnMount = false } = options;

  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>("0.0.1");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRef = useRef<Update | null>(null);
  updateRef.current = update;

  // Retrieve the current app version on mount
  useEffect(() => {
    getVersion()
      .then((ver) => setCurrentVersion(ver))
      .catch(() => {
        // Fallback if not running inside Tauri runtime
      });
  }, []);

  // Cleanup rust update resource if not consumed
  useEffect(() => {
    return () => {
      if (updateRef.current) {
        updateRef.current.close().catch(() => {});
      }
    };
  }, []);

  const checkForUpdates = useCallback(async (silent = false): Promise<Update | null> => {
    try {
      setStatus("checking");
      setError(null);

      // Clean up previous update reference if any
      if (updateRef.current) {
        await updateRef.current.close().catch(() => {});
        setUpdate(null);
      }

      const foundUpdate = await check();

      if (foundUpdate) {
        setUpdate(foundUpdate);
        setStatus("available");
        return foundUpdate;
      } else {
        setStatus("up-to-date");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
      if (!silent) {
        console.error("Failed to check for updates:", err);
      }
      return null;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    try {
      setStatus("downloading");
      setError(null);

      let contentLength = 0;
      let downloaded = 0;

      await update.downloadAndInstall((event: DownloadEvent) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            setProgress({
              downloaded: 0,
              total: contentLength,
              percentage: 0,
            });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setProgress({
              downloaded,
              total: contentLength,
              percentage: contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0,
            });
            break;
          case "Finished":
            setStatus("downloaded");
            break;
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
      console.error("Failed to download/install update:", err);
    }
  }, [update]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setProgress(null);
  }, []);

  useEffect(() => {
    if (autoCheckOnMount) {
      checkForUpdates(true);
    }
  }, [autoCheckOnMount, checkForUpdates]);

  return {
    status,
    update,
    currentVersion,
    targetVersion: update?.version ?? null,
    progress,
    error,
    checkForUpdates,
    downloadAndInstall,
    reset,
  };
}

