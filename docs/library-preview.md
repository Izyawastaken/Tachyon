# Pod library preview

Open **Library** in the sidebar. Four sample pods demonstrate playtime, versions, loaders, favorites, cover artwork, and last-played information. Pod cards expand into a workspace; the circular plus opens the creation panel using a CSS reveal originating at the button. Both respect reduced motion.

The workspace includes:

- **Content:** mods, resource packs, and shaders; search by name or author, filter by state or category, sort, and toggle enabled state.
- **Add mods:** a small sample catalog with search, category and type filters, project details, and simulated installs into the current pod. Required compatibility checks and dependency resolution remain future installation work.
- **Files:** sample folder navigation, breadcrumb navigation, recursive path/name search, and read-only file previews.
- **Worlds:** search and inspect sample world metadata.
- **Logs:** search and filter a sample session by severity, then copy visible lines.
- **Share:** view and copy an imported repository link. Share-code generation is not connected.
- **Settings:** edit the pod name, description, and cover artwork.

Preview changes survive switching sidebar pages in the current app session. Reloading resets all pods to the samples. No instance directories, game files, or repository contents are created or downloaded.

## Import lookup

The existing TypeScript/Tailwind CodeSlots component now has an optional alphanumeric mode; its numeric default is preserved. Import uses eight characters, supports lowercase and pasted hyphens, and retains the code after lookup errors for retry.

`library_resolve_code` is the only real backend operation added. [Neutrino-Obscura 1.0.0](https://docs.rs/neutrino-obscura/1.0.0/neutrino_obscura/) parses and validates the code and yields a numeric repository ID. Rust retrieves public metadata from GitHub's `/repositories/{id}` endpoint and returns only the HTTPS `github.com` repository link. The UI displays that link; **Continue** creates an empty in-memory preview pod. A code does not prove that a repository contains a valid instance.

Example: `1B6F-8TGK` resolves to `https://github.com/Izyawastaken/Tachyon`.

## Verification

- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm exec playwright test --config tests/library.playwright.config.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml library::tests` (offline validation)
- `cargo test --manifest-path src-tauri/Cargo.toml library::tests -- --include-ignored` (also checks the public GitHub lookup; needs network access)

The browser fixture mocks the Tauri lookup boundary and rejects unexpected backend commands. It covers create/import/retry, state preservation, content filtering/toggling/install, recursive file search, file and world previews, keyboard tab navigation, settings, focus return, compact layout, and reduced motion. Screenshots are saved under `tests/generated/library-*.png`.
