import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const keyPath = path.join(os.homedir(), ".tauri", "tachyon.key");

const result = spawnSync("pnpm", ["tauri", "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: keyPath,
  },
});

process.exit(result.status ?? 0);

