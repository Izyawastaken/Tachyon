# Home discovery

Home uses the public Moddex v2 API. No token is required. See https://moddex.gg/api/docs.

## Ranking

- Trending: latest 50 ratings (including quick ratings) for mods created in the last seven days. Rank projects by distinct raters within that sample, then most recent rating, then project ID for deterministic ties. Duplicate review IDs and repeat raters do not inflate scores. Delisted projects and modpacks are excluded. This measures recent community attention, not download velocity, acceleration, or a global trend. The UI discloses the sample and methodology.
- Hidden gems: `type=mod`, `max_downloads=100000`, `min_rating=4`, `min_reviews=3`, ordered by `bayesian_rating` descending. Download count is only an eligibility ceiling. Moddex applies its documented rounded-download filter. Show up to eight qualifying projects without filling gaps with unrelated popular mods.

## Performance and caching

Two independent IPC requests let either section render without waiting for the other. Moddex requests run in Rust, share HTTP connections, identify Tachyon via X-Client, and use a separate transport/backoff state from Modrinth. HTTP 429 and 503 responses respect Retry-After. There are no per-card metadata requests.

Engram shares the existing Explore memory/SQLite cache. Feed keys are schema-versioned and derived from the full request URL. The seven-day cutoff is rounded to the hour for stable upstream validators. Entries are fresh for four minutes and expire at five minutes; cached entries render immediately, while stale entries revalidate in the background using ETags. Engram coalesces concurrent retrievals. Expired feed records are not served offline. The frontend uses the remaining cache lifetime to schedule refresh and does not persist feed data in localStorage.

Icons use the existing lazy, bounded-concurrency image pipeline and Engram media cache. Home is a separate lazy chunk; project detail, Explore, and 3D skin preview code are not needed to render it.

## Verification

- `pnpm build`
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`
- `cargo test --manifest-path src-tauri/Cargo.toml live_moddex_home_cache --lib -- --ignored --nocapture` (network required)
- `pnpm exec playwright test --config tests/home.playwright.config.ts`

The browser harness uses explicit synthetic fixtures isolated from production. It covers independent loading, ranking display, external project links, Explore navigation, retry, empty and saved states, and narrow/reduced-motion layouts. The opt-in native test verifies live API deserialization, gem eligibility, and an Engram cache hit.

Observed in the development environment: home-specific JavaScript 2.99 KB gzip (shared shell/runtime excluded), warm native Engram read 71.6 microseconds. These are local measurements, not end-to-end startup guarantees.
