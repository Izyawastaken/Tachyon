import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";

export type Section = "trending" | "gems";
export interface Entry {
  project: { id: number; name: string; slug: string; logo_url: string | null; summary: string | null; downloads_count: number | null; rating: { average: number | null; bayesian: number | null; count: number } };
  recent_ratings: number;
}
export interface Feed { entries: Entry[]; sampled: number; total: number; stale: boolean; refresh_after_ms: number }
const requests = new Map<Section, Promise<Feed>>();
function load(section: Section) {
  if (!isTauri()) return Promise.reject(new Error("Open the Tachyon desktop app to discover mods."));
  const existing = requests.get(section);
  if (existing) return existing;
  const request = invoke<Feed>("home_feed", { section }).finally(() => requests.delete(section));
  requests.set(section, request);
  return request;
}
export function useFeed(section: Section) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let unlisten: (() => void) | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const accept = (result: Feed) => {
      if (!active) return;
      setFeed(result); setError(null); setLoading(false);
      clearTimeout(expiry);
      // Don't leave a supposedly current ranking on an indefinitely open home screen.
      expiry = setTimeout(() => { if (active) { setFeed(null); retry(); } }, Math.max(1000, Math.min(result.refresh_after_ms, 240_000)));
    };
    setLoading(true);
    setError(null);
    void (async () => {
      if (isTauri()) {
        const stop = await listen<{ section: Section; result: Feed }>("home:refreshed", event => {
          if (event.payload.section === section && active) { revision++; accept(event.payload.result); }
        });
        if (!active) { stop(); return; }
        unlisten = stop;
      }
      const before = revision;
      const result = await load(section);
      if (revision === before) accept(result);
    })().catch(error => { if (active) { setError(error instanceof Error ? error.message : String(error)); setLoading(false); } });
    return () => { active = false; unlisten?.(); clearTimeout(expiry); };
  }, [section, attempt, retry]);
  return { feed, error, loading, retry };
}
