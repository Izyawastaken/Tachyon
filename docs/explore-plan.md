# Explore implementation plan

Branch: `codex/features/explore`, based on `exp-dev`. Work sequentially and merge only after verification.

## Design and boundaries

- Retain the existing dark canvas, espresso palette, atmosphere, rounded viewport and sidebar spring.
- Explore is a viewport within that shell: top filters displace its top edge; bottom content selectors displace its bottom edge. Hover is enhanced by explicit toggle buttons, keyboard focus and touch access.
- Use the installed Motion spring for interruptible geometry changes and shared surfaces; CSS handles colors, opacity and small feedback. No additional animation framework.
- Readable 14–16px body, 20/32px headings, 4px spacing and concentric radii. Opaque surfaces first, restrained frosting only on the controls.
- Rust owns HTTP, canonical queries, cache policies, metadata normalization, Markdown sanitization and remote images. React calls typed Tauri commands only. No frontend network fallback.
- Catalog browsing and project information are in scope. Installation and instance selection are separate features; do not add nonfunctional install buttons.

## Tasks

- [x] 1. Inspect shell, installed Engram 0.2.5 source/docs and current Modrinth API. Define architecture.
- [ ] 2. Rust catalog and media service, Tauri commands, Engram V1/R1 integration and backend tests.
- [ ] 3. Explore routing, search/grid, top filter drawer and bottom type selector.
- [ ] 4. Shared card/detail spring morph, hold-Space Quick Look, accessible interaction cleanup.
- [ ] 5. Backend tests, actual-origin smoke test, UI verification, production build, then merge into exp-dev.

## Backend policy

- One lazy-initialized pooled HTTP client and Engram instance per app; bounded origin concurrency and timeouts.
- Stable schema-tagged cache keys, canonicalized facet groups, fixed pagination limits.
- Engram's L1 Moka and L2 SQLite WAL remain the storage system. V1 uses conditional GET with ETag/Last-Modified; R1 retrieves on misses or changes. Reuse an already downloaded changed response instead of a second HTTP request.
- Search freshness 2 minutes; project freshness 15 minutes; tags 6 hours. Retain search 24 hours, projects/tags 7 days for offline fallback. Report stale results clearly. Errors never masquerade as empty results.
- Cache metadata and parsed API models, not `serde_json::Value` (Engram serializes with bincode). Cache media as local files and keep path metadata in Engram; frontend receives local asset URLs only. Bound response sizes and media disk usage.
- No speculative detail fetching on ordinary pointer movement. Quick Look uses search summaries; click requests full detail. Debounce query changes and ignore superseded responses.

## UI interaction contract

- Search remains visible. Top drawer: Minecraft version, loader, category, environment, sort and reset. Bottom drawer: modpacks, mods, shaders, resource packs, data packs.
- Opening a drawer changes the content viewport dimensions, without scrolling or covering its content. Focus keeps controls open; Escape collapses them. The detail view temporarily closes drawers.
- Cards expand to an inset full-viewport detail surface and reverse to their measured origin. Preserve grid DOM, scroll offset and focus. Escape/back returns to the originating card.
- Hold Space on a hovered/focused card for a short deliberate dwell to expand to 2 columns × 2 rows where space permits. Release, blur, Escape, typing, filter/page changes or navigation cancel it. Narrow layouts expand vertically. Prevent page scrolling only while handling this shortcut.
- No frame-driven React state. Limit layout animations to the current page, animate backgrounds rather than text when appropriate, honor reduced motion and clean up listeners/timers.

## Sources

- Installed authoritative source: `engram-cache-0.2.5/src/{lib,source,config,engine}.rs`; docs.rs endpoint was unavailable during inspection.
- https://docs.rs/engram-cache/latest/engram/
- https://docs.modrinth.com/api/operations/searchprojects/
- https://docs.modrinth.com/api/operations/getproject/
- https://docs.rs/pulldown-cmark/latest/pulldown_cmark/
- https://docs.rs/ammonia/latest/ammonia/
- https://v2.tauri.app/reference/javascript/api/namespacecore/#convertfilesrc
