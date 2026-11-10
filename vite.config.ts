import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import process from "node:process";
import fs from "node:fs";

// Sync version from package.json to Cargo.toml
try {
  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  const cargoPath = "./src-tauri/Cargo.toml";
  const cargo = fs.readFileSync(cargoPath, "utf-8");
  const updated = cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${pkg.version}"`);
  if (cargo !== updated) {
    fs.writeFileSync(cargoPath, updated);
  }
} catch {
  // ignore
}

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
