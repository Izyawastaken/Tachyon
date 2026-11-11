export interface Screenshot {
  id: string;
  path: string;
  filename: string;
  instance: string;
  instance_id: string;
  version: string | null;
  loader: string | null;
  taken_at: number;
  width: number;
  height: number;
}
export interface ScreenshotLibrary {
  screenshots: Screenshot[];
  sources: { path: string; name: string; count: number }[];
  warnings: string[];
}
export interface ScreenshotFilters {
  instance: string;
  version: string;
  loader: string;
  period: string;
  orientation: string;
  sort: string;
}
export const INITIAL_FILTERS: ScreenshotFilters = {
  instance: "", version: "", loader: "", period: "", orientation: "", sort: "newest",
};
export function filterScreenshots(items: Screenshot[], filters: ScreenshotFilters, query: string, now = Date.now()) {
  const search = query.trim().toLocaleLowerCase();
  const days = filters.period ? Number(filters.period) : 0;
  return items.filter(item =>
    (!filters.instance || item.instance_id === filters.instance) &&
    (!filters.version || (item.version ?? "unknown") === filters.version) &&
    (!filters.loader || (item.loader ?? "unknown") === filters.loader) &&
    (!days || item.taken_at >= now - days * 86_400_000) &&
    (!filters.orientation || (filters.orientation === "landscape" ? item.width > item.height : filters.orientation === "portrait" ? item.height > item.width : item.width === item.height)) &&
    (!search || `${item.filename} ${item.instance} ${item.version ?? ""} ${item.loader ?? ""}`.toLocaleLowerCase().includes(search))
  ).sort((a, b) => filters.sort === "oldest" ? a.taken_at - b.taken_at || a.id.localeCompare(b.id)
    : filters.sort === "name" ? a.filename.localeCompare(b.filename, undefined, { numeric: true }) || a.id.localeCompare(b.id)
    : b.taken_at - a.taken_at || a.id.localeCompare(b.id));
}
