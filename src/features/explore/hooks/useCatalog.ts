import { startTransition, useEffect, useState } from "react";
import { errorMessage, getFilters, searchCatalog } from "../api";
import type { CatalogResult, Filters, SearchInput, SearchPage } from "../types";

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

export function useCatalog(input: SearchInput) {
  const [result, setResult] = useState<CatalogResult<SearchPage> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // Coalesce Strict Mode setup replay before crossing IPC.
    queueMicrotask(() => {
      if (!active) return;
      void searchCatalog(input).then(data => {
        if (active) startTransition(() => { setResult(data); setLoading(false); });
      }).catch(cause => { if (active) { setError(errorMessage(cause)); setLoading(false); } });
    });
    return () => { active = false; };
  }, [input, retry]);
  return { result, loading, error, retry: () => setRetry(value => value + 1) };
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    queueMicrotask(() => {
      if (active) void getFilters().then(result => { if (active) setFilters(result.data); })
        .catch(cause => { if (active) setError(errorMessage(cause)); });
    });
    return () => { active = false; };
  }, [retry]);
  return { filters, error, retry: () => setRetry(value => value + 1) };
}
