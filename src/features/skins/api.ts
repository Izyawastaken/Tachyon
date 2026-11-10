import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import type { ImportResult, SkinLibrary, SkinModel } from "./types";

function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return Promise.reject(new Error("Open Tachyon on your desktop to manage skins."));
  return invoke<T>(name, args);
}
export const getLibrary = () => command<SkinLibrary>("skins_library");
export const importFiles = (paths?: string[]) => command<ImportResult>("skins_import_files", { paths: paths ?? null });
export const importPlayer = (input: string) => command<ImportResult>("skins_import_player", { input });
export const editSkin = (id: string, action: "select" | "favorite" | "rename" | "remove" | "undo", model?: SkinModel, name?: string) => command<SkinLibrary>("skins_edit", { id, action, model: model ?? null, name: name ?? null });
export const exportSkin = (id: string, model: SkinModel) => command<string | null>("skins_export", { id, model });
export const asset = (path: string) => convertFileSrc(path);
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
