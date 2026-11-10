import { useCallback, useEffect, useRef, useState } from "react";
import { cancelDownload, downloadFile, errorMessage } from "../api";
import type { DownloadProgress, DownloadReceipt, ProjectVersion, VersionFile } from "../types";

export function useProjectDownload(projectId: string) {
  const current = useRef<string | null>(null);
  const mounted = useRef(true);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DownloadReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (current.current) void cancelDownload(current.current).catch(() => {});
    };
  }, []);
  const start = useCallback(async (version: ProjectVersion, file: VersionFile) => {
    if (current.current) return;
    const id = crypto.randomUUID();
    current.current = id;
    setBusy(true); setError(null); setReceipt(null); setProgress(null); setFilename(file.filename);
    try {
      const saved = await downloadFile(projectId, version.id, file.filename, id, event => {
        if (mounted.current && current.current === id) setProgress(event);
      });
      if (mounted.current) { setReceipt(saved); if (!saved) setFilename(null); }
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      current.current = null;
      if (mounted.current) setBusy(false);
    }
  }, [projectId]);
  const cancel = useCallback(() => {
    if (current.current) void cancelDownload(current.current).catch(cause => { if (mounted.current) setError(errorMessage(cause)); });
  }, []);
  return { start, cancel, busy, progress, receipt, error, filename };
}
