import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import type { CatalogResult, Filters, ProjectDetail, SearchInput, SearchPage } from "./types";

function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return Promise.reject(new Error("Open Tachyon on your desktop to browse the Modrinth catalog."));
  return invoke<T>(name, args);
}
export const searchCatalog = (input: SearchInput) => command<CatalogResult<SearchPage>>("explore_search", { input });
export const getFilters = () => command<CatalogResult<Filters>>("explore_filters");
export const getProject = (id: string) => command<CatalogResult<ProjectDetail>>("explore_project", { id });

// Deduplicate IPC for repeated icons. Catalog values and remote bytes live only in Rust.
const imageRequests = new Map<string, Promise<string>>();
export function localImage(url: string): Promise<string> {
  const existing = imageRequests.get(url);
  if (existing) return existing;
  const request = command<string>("explore_image", { url }).then(convertFileSrc).catch(error => {
    imageRequests.delete(url);
    throw error;
  });
  imageRequests.set(url, request);
  if (imageRequests.size > 128) imageRequests.delete(imageRequests.keys().next().value!);
  return request;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
