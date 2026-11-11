# Screenshots

Screenshots is backed by Rust and actual local PNG files. It automatically scans the default Minecraft screenshots directory when present. **Link instance** opens a native folder picker and accepts an instance, game directory or screenshots directory. Linked sources persist in the app's screenshot data directory as `sources.json`.

The scanner reads image dimensions, derives capture dates from Minecraft filenames with a filesystem timestamp fallback, deduplicates folders and reports unavailable sources. Instance metadata supplies names, versions and loaders where available. Only discovered image files are authorized for display in the webview.

The page supports refresh, filename search, instance/version/loader/date filters, sorting, responsive masonry and a gallery viewer. Linking does not copy or modify the source screenshots. Capture, upload and game launching are outside this page's scope.

## Verification

- `pnpm build`
- `cargo test --manifest-path src-tauri/Cargo.toml --lib screenshots::tests`
- `pnpm exec playwright test --config tests/screenshots.playwright.config.ts`

Rust tests exercise real temporary PNGs, metadata, deduplication and missing folders. Browser tests use explicit native-command fixtures; they do not exercise the operating system's folder picker.
