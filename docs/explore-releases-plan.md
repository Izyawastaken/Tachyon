# Explore release browsing and downloads

1. [x] Add Rust models and cached release queries. Ask Modrinth for lists without changelogs; filter and page in Rust, then retrieve a single changelog on demand.
2. [x] Add Description, Versions, Changelog and Gallery tabs with existing theme tokens and short reveals. Show release channel, compatibility, dates, files and dependencies.
3. [x] Add a visible Download action and a native Save dialog. Rust streams the selected API-owned file to a temporary sibling, validates length and SHA-512, then commits it atomically. Include progress and cancellation. Downloads save files; instance installation is a separate feature because no instance backend exists yet.
4. [x] Verify filtering/paging, corrupt and cancelled transfers, cache behavior, production build and real Modrinth release data. Keep frontend code free of remote fetching.

Preserve the existing uncommitted text reveal and unrelated theme reference files. Do not publish a new release as part of this feature work.


## Verification

- Production build and TypeScript check passed. Catalog code remains a separate lazy chunk; detail animation code warms on card hover/focus.
- 18 deterministic Rust tests passed. Transfer tests cover checksum/length checks, successful atomic replacement, corrupt-file preservation, cancellation and partial-file cleanup. Clippy passes with warnings denied.
- Explicit live test queried Fabric API releases, filtered Minecraft 1.21.1/Fabric/release entries, retrieved Markdown changelogs and downloaded a real file to a temporary directory with SHA-512 verification.
- Browser checks use Rust-captured fixtures: primary Download opens Versions, compatibility/channel filters reduce 1,224 releases to 37, paging changes releases, changelog Markdown renders, the chosen filename/project/release IDs reach the download command, and cancelling the mocked Save dialog leaves no error. The native Save dialog itself is wired through the Rust Tauri plugin; browser fixtures do not open a native dialog.
- Gallery has a dedicated tab and retains original-resolution media support. Descriptions retain the existing text reveal, while all new controls use theme colors and respect reduced motion.

## Cache and network behavior

Version lists request `include_changelog=false`, are cached through the existing Engram L1/L2 and ZSTD policy, and return at most 20 releases over IPC. Minecraft/loader filters are sent to Modrinth; channel filtering, ordering and pagination run in Rust. Lists are fresh for five minutes and retained for one day. Individual releases and rendered changelogs are cached independently, with seven-day retention. Dependency names are resolved in a cached bulk request.

Downloads accept project/version/file identities, never arbitrary frontend URLs or destination paths. Rust looks up authoritative metadata, opens Save, streams bounded chunks, throttles progress to 10 Hz, verifies byte length and SHA-512, and only then atomically persists the sibling temporary file. Two transfers can run within the shared six-request budget. Cancellation wakes pending network reads; normal failure/cancellation drops temporary files. Downloaded artifacts are not duplicated into the metadata cache or recompressed.

To refresh the release UI fixtures:

```powershell
$env:TACHYON_RELEASE_SNAPSHOT = "$PWD/tests/generated/releases.json"
cargo test --manifest-path src-tauri/Cargo.toml --lib live_releases_and_download_smoke_test -- --ignored --nocapture
```

Generate the catalog fixtures using `docs/explore-verification.md` as well before opening `/tests/explore-preview.html`.
