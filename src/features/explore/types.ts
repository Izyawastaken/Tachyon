export type ContentKind = "modpack" | "mod" | "shader" | "resourcepack" | "datapack";
export type SortOrder = "relevance" | "downloads" | "follows" | "newest" | "updated";
export interface SearchInput {
  query: string;
  kind: ContentKind;
  versions: string[];
  loaders: string[];
  categories: string[];
  environment: string;
  sort: SortOrder;
  offset: number;
}
export interface CatalogResult<T> { data: T; stale: boolean }
export interface ProjectHit {
  project_id: string;
  slug: string | null;
  title: string;
  description: string;
  author: string;
  project_type: string;
  downloads: number;
  follows: number;
  icon_url: string | null;
  categories: string[];
  display_categories: string[];
  versions: string[];
  date_modified: string;
  featured_gallery: string | null;
}
export interface SearchPage { hits: ProjectHit[]; offset: number; limit: number; total_hits: number }
export interface Filters {
  versions: { version: string; version_type: string }[];
  loaders: { name: string; supported_project_types: string[] }[];
  categories: { name: string; project_type: string; header: string }[];
}
export interface Project {
  id: string; slug: string; title: string; description: string; body: string;
  project_type: string; icon_url: string | null; downloads: number; followers: number;
  categories: string[]; game_versions: string[]; loaders: string[];
  license: { id: string; name: string };
  source_url: string | null; issues_url: string | null; wiki_url: string | null;
  gallery: { url: string; raw_url?: string | null; featured: boolean; title: string | null }[];
}
export interface ProjectDetail { project: Project; body_html: string }
export interface VersionFile { filename: string; url: string; size: number; primary: boolean; hashes: { sha512: string } }
export interface VersionDependency { project_id: string | null; version_id: string | null; file_name: string | null; dependency_type: string }
export interface ProjectVersion {
  id: string; project_id: string; name: string; version_number: string;
  version_type: string; date_published: string; downloads: number; featured: boolean;
  game_versions: string[]; loaders: string[]; changelog: string | null;
  files: VersionFile[]; dependencies: VersionDependency[];
}
export interface VersionInput { project_id: string; game_version: string; loader: string; channel: string; offset: number }
export interface VersionPage { versions: ProjectVersion[]; total: number; offset: number; limit: number }
export interface VersionDetail { version: ProjectVersion; changelog_html: string; dependencies: { name: string; dependency_type: string; url: string | null }[] }
export interface DownloadProgress { downloaded: number; total: number; stage: "downloading" | "verifying" | "complete" }
export interface DownloadReceipt { path: string; filename: string; size: number }

export const CONTENT_TYPES: { id: ContentKind; label: string; singular: string }[] = [
  { id: "modpack", label: "Modpacks", singular: "Modpack" },
  { id: "mod", label: "Mods", singular: "Mod" },
  { id: "shader", label: "Shaders", singular: "Shader" },
  { id: "resourcepack", label: "Resource packs", singular: "Resource pack" },
  { id: "datapack", label: "Data packs", singular: "Data pack" },
];
export const PAGE_SIZE = 12;
export const INITIAL_SEARCH: SearchInput = { query: "", kind: "mod", versions: [], loaders: [], categories: [], environment: "", sort: "relevance", offset: 0 };
export const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const fullNumber = new Intl.NumberFormat("en");
export function displayTag(value: string) { return value.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase()); }
