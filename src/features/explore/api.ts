import { Channel, convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import type { CatalogResult, Filters, ProjectDetail, SearchInput, SearchPage, VersionInput, VersionPage, VersionDetail, DownloadProgress, DownloadReceipt } from "./types";

function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return Promise.reject(new Error("Open Tachyon on your desktop to browse the Modrinth catalog."));
  return invoke<T>(name, args);
}
export const searchCatalog = (input: SearchInput) => command<CatalogResult<SearchPage>>("explore_search", { input });
export const getFilters = () => command<CatalogResult<Filters>>("explore_filters");
export const getProject = (id: string) => command<CatalogResult<ProjectDetail>>("explore_project", { id });
export const getVersions = (input: VersionInput) => command<CatalogResult<VersionPage>>("explore_versions", { input });
export const getVersion = (id: string) => command<CatalogResult<VersionDetail>>("explore_version", { id });
export const cancelDownload = (requestId: string) => command<void>("explore_cancel_download", { requestId });
export function downloadFile(projectId: string, versionId: string, filename: string, requestId: string, progress: (event: DownloadProgress) => void) {
  const onProgress = new Channel<DownloadProgress>();
  onProgress.onmessage = progress;
  return command<DownloadReceipt | null>("explore_download", { input: { project_id: projectId, version_id: versionId, filename, request_id: requestId }, onProgress });
}

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
export function searchIdentity(input: SearchInput) {
  return JSON.stringify({ query: input.query.trim(), kind: input.kind, versions: [...input.versions].sort(), loaders: [...input.loaders].sort(), categories: [...input.categories].sort(), environment: input.environment, sort: input.sort, offset: input.offset });
}
