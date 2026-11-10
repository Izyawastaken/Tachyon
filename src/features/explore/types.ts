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
  gallery: { url: string; featured: boolean; title: string | null }[];
}
export interface ProjectDetail { project: Project; body_html: string }

export const CONTENT_TYPES: { id: ContentKind; label: string; singular: string }[] = [
  { id: "modpack", label: "Modpacks", singular: "Modpack" },
  { id: "mod", label: "Mods", singular: "Mod" },
  { id: "shader", label: "Shaders", singular: "Shader" },
  { id: "resourcepack", label: "Resource packs", singular: "Resource pack" },
  { id: "datapack", label: "Data packs", singular: "Data pack" },
];
export const INITIAL_SEARCH: SearchInput = { query: "", kind: "mod", versions: [], loaders: [], categories: [], environment: "", sort: "relevance", offset: 0 };
export const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const fullNumber = new Intl.NumberFormat("en");
export function displayTag(value: string) { return value.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase()); }
