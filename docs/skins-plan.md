# Skins studio

Branch: `feat/skins`. Keep this feature on its requested branch.

1. Bundle the official nine default characters in classic/slim variants; Steve is selected on first launch. Validate and normalize PNG imports in Rust, generate lightweight head thumbnails, and persist an atomic local library with backup recovery.
2. Resolve Minecraft usernames, UUIDs and official texture links in Rust with pooled HTTP, bounded requests, timeouts, rate-limit handling, Engram L1/L2, ZSTD, and single-flight cache resolution. Keep imported skins pinned in app data for offline use.
3. Build a Skins route inside the existing shell. Provide upload/drop, player lookup, texture URL import, search, favorites, rename, export, remove/undo, classic/slim selection, and a single interactive 3D viewer.
4. Verify PNG limits, malformed input, legacy/HD formats, persistence/recovery, lookup validation, deterministic defaults, offline access, UI interactions, WebGL fallback and build/performance checks.

Selection is local to Tachyon because the launcher has no Minecraft account/auth backend yet. The UI must state this honestly and must not claim an account skin has been changed.

3D rendering belongs to the presentation layer. Remote fetching, file validation, storage and cache policy remain in Rust. Keep Three.js/skinview3d in a lazy feature chunk. Use one canvas, cap device-pixel ratio, suspend rendering offscreen/when hidden, and dispose GPU/event resources on unmount. Respect reduced motion.

## Implemented

The dressing room uses the shell's existing palette, type and corner geometry. A quiet thumbnail library sits beside a single fitting room, with a restrained isometric platform beneath the character. Selection changes the shared preview without recreating its renderer. Imports expand within the library and use the shell spring; reduced motion disables animation and automatic rotation.

- Official Java 1.21.1 textures: Steve, Alex, Ari, Efe, Kai, Makena, Noor, Sunny, Zuri. Both model variants are bundled. Provenance and hashes live beside the assets.
- Upload via native multi-file picker or OS drag/drop; Java username, UUID and official texture-link imports; search, favorites, rename, PNG export, removal and undo. Model selection is persisted when choosing **Use skin**.
- Rust validates the actual PNG bytes, rejects APNG/damaged/oversized input, supports power-of-two square or legacy 2:1 dimensions from 64 to 1024 px, strips extraneous metadata, generates head thumbnails and deduplicates decoded pixels. Re-import repairs missing owned files.
- Imported files are copied to the app's owned data directory; originals are never edited. Atomic manifest and PNG publication, a last-good backup, offline defaults, default-asset repair, 200 custom-skin / 256 MiB library limits, and bounded 20-item removal history protect local storage.
- All network and file operations run in Rust. Network access is restricted to fixed Minecraft services and validated official texture URLs; redirects are disabled. Pooled HTTP has two request slots, bounded bodies, connection/total timeouts and shared rate-limit cooldown. Two concurrent imports are permitted; batch size is 32.
- Engram: lazy 8 MiB L1, SQLite L2, ZSTD level 1 above 1 KiB only when smaller, two SQLite connections, normal synchronous mode for reproducible cache data. Profiles validate after 5 minutes with one-day retention; immutable texture links retain for 30 days. V1 reuses fetched profile metadata for R1; unchanged texture identities avoid another image download. Single-flight resolution and saved-result fallback work across launches. Imported library files live independently of cache expiry.
- The viewer is separately lazy-loaded, uses one canvas with DPR capped at 1.5 and an average 60 Hz rendering ceiling, and suspends its loop while hidden, offscreen, importing, in Still mode, or under reduced motion. It disposes textures, geometry, materials, render targets, controls and observers on route exit. Decoded local images use an LRU bounded by 12 images / 16 MiB.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: deterministic PNG, defaults, persistence, repair, backup recovery, deletion/undo and input-boundary tests, alongside the existing Explore suite.
- `cargo test --manifest-path src-tauri/Cargo.toml live_player_import_cache_reopen_and_preview_fixture -- --ignored`: optional live official-service check. Successfully imported Notch, validated the PNG, reopened L2, and resolved the saved skin again.
- `pnpm test:skins`: generates offline fixtures with Rust, then checks the UI in installed Chrome. Covers actual WebGL rendering, selection, models, favorites, searching, import success/error, rename, undo, export invocation, Escape/focus behavior, narrow layout, reduced motion, and graphics-context loss/retry. Confirms the frontend makes no remote HTTP requests. Native file-dialog interaction itself is outside the isolated browser harness.
- `pnpm build` and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`.

The 3D dependency is about 131 KiB gzipped and loads only for the fitting room; the production build reports its normal large-chunk advisory.

## 0.0.14 release refinement

Shell morphs retain the last composited skin frame while CSS scales it to the moving viewport. The drawing buffer and GPU animation loop pause until Motion signals the spring has finished and dimensions have been quiet for 120 ms. Window resizes use the same quiet-period coalescing. The viewer then applies the final dimensions and redraws in the same callback before resuming animation. This prevents each ResizeObserver callback from clearing an already-rendered frame and removes repeated GPU reallocations during the spring. Animation pose survives pause/resume; Still and reduced-motion views get one final repaint.

The browser regression checks actual skin pixels through repeated expansion/collapse, deferred drawing-buffer allocation, resumed animation, and idle Still mode. The release version is 0.0.14, published through the existing signed-updater workflow.
