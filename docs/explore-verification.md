# Explore verification and architecture

## Completed checks

- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 10 passed; the explicit network smoke test is ignored in the normal deterministic suite.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: clean.
- `pnpm build`: TypeScript and production build pass. Explore is a lazy chunk of approximately 11.7 KB gzipped. The existing main-bundle size warning remains.
- Explicit Rust live-origin smoke test: all five content types, project Markdown, filter metadata, and 119 unique raster icons retrieved successfully.
- Browser interaction verification uses an isolated test entry with real data and media captured by that Rust smoke test, not frontend HTTP calls. The harness and generated fixtures are excluded from the production entry; generated data is gitignored.
- Native accessibility inspection also confirmed the real desktop catalog showing live results and paging. Browser snapshots provide the repeatable visual and interaction checks.

## Verified interactions

- Sidebar opens Explore through the actual shell route.
- Top filter drawer moves the viewport down; bottom type selector moves its lower edge up.
- All five type controls appear; switching to shaders updates the heading, search label and project grid.
- Hold-Space Quick Look expands a normal 299×216 card to 613×448, a two-column/two-row footprint including the grid gap. Releasing Space reverses it.
- Clicking a project expands it into the full viewport with Rust-rendered, sanitized Markdown, compatibility and links.
- Escape reverses the detail expansion and restores focus to the original card.
- An unmatched search shows a useful empty state and reset action. Space inside the search input never opens Quick Look.
- Reduced-motion preferences are honored by the shared Motion provider and CSS overrides. A narrow grid expands Quick Look vertically instead of overflowing a second column.

## Cache and request policy

- One asynchronous Engram instance, one pooled HTTP client, stable typed schema tags.
- 48 MiB weighted L1; persistent SQLite WAL L2 with three connections and NORMAL durability for reproducible cache data.
- ZSTD level 1, 1 KiB compression threshold, and compression only when smaller. Raster bytes remain in local files rather than being copied into L1 or recompressed.
- Default first page warms at launch. An L2 hit is promoted to L1 before revalidation; the first eight icons are warmed without delaying app startup.
- Explore preloads the next two pages. Obsolete filter/query families cancel their jobs; paging within the same family retains shared work. Results beyond the catalog/page limit are never scheduled.
- Six total origin requests, at most two image retrievals and two lookahead workers. Search typing is debounced before IPC, and obsolete UI responses are ignored.
- Cached search pages return immediately. Rust uses Engram background V1/R1 revalidation and emits refreshed results; the UI guards against an older IPC response overwriting a newer refresh event.
- Conditional ETag/Last-Modified validation retains validators omitted by 304 responses. A changed 200 body is handed from V1 to R1 rather than downloaded again.
- Freshness intervals: search 2 minutes, projects 15 minutes, filter metadata 6 hours. Persistent retention: search 24 hours, projects/tags/media metadata 7 days, with expiry cleanup every 30 minutes.
- Media has a periodic 256 MiB disk budget. Old paths are repaired through Engram on the next request if a file was pruned. Responses are size bounded, origins restricted, redirects disabled and raster signatures checked.
- Origin failures do not overwrite valid cached values. Rate-limit Retry-After is respected. Quick Look uses the existing search summary and creates no detail request.

## Backend/UI boundary

`src-tauri/src/explore/` owns API requests, canonicalization, cache policy, Markdown sanitization and remote image retrieval. `src/features/explore/` owns presentation and local interaction state, calling typed Tauri commands. Icons/gallery images are served through the scoped local asset protocol. Links open through the native opener.

Buffered writes are deliberately not enabled globally: the V1/R1 source commit already controls its consistency, and adding another writer queue would not speed those origin commits. Arc reads, source single-flight, ZSTD, background resolution and L2 promotion are used where they improve this workload.

## Reproduce live UI verification

```powershell
New-Item -ItemType Directory -Force tests/generated
$env:TACHYON_EXPLORE_SNAPSHOT = "$PWD/tests/generated/catalog.json"
cargo test --manifest-path src-tauri/Cargo.toml --lib explore::tests::live_catalog_smoke_test -- --ignored --nocapture
pnpm dev
```

Open `/tests/explore-preview.html` on the local development server. The ordinary app has no browser/network fallback; use the desktop build for real catalog operations. Restart the desktop development process after Rust changes.

Catalog installation and instance targeting are intentionally outside this browsing feature. No release tag is created by this merge.
