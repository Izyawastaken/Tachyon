import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import type { ScreenshotLibrary } from "./types";
function command<T>(name: string): Promise<T> {
  if (!isTauri()) return Promise.reject(new Error("Open Tachyon on your desktop to browse your Minecraft screenshots."));
  return invoke<T>(name);
}
export const getScreenshots = () => command<ScreenshotLibrary>("screenshots_library");
export const linkInstance = () => command<ScreenshotLibrary | null>("screenshots_link_instance");
export const screenshotAsset = (path: string) => convertFileSrc(path);
