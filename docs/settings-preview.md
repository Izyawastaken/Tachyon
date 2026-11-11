# Settings UI preview

Open **Settings** with the gear in the launcher sidebar. The twelve categories cover launcher preferences, Java, instance defaults, network, storage, caching, sharing, servers, appearance, accounts, diagnostics, and advanced configuration.

## Interaction model

- Search across categories with **Ctrl+K** or **Ctrl+,**. Escape clears the search.
- The scope picker switches between global defaults and three sample instances. Game settings show **Inherited** or **Overridden**, with a reset action. Launcher-wide settings are marked when viewing an instance.
- Memory minimum and maximum form a pair: overriding either captures both values so later global edits cannot invalidate the instance’s range. Resetting either restores the inherited pair.
- Preferences persist separately from real launcher configuration under `tachyon.settings-preview.v1` in browser storage. Settings JSON imports are validated and previewed before replacement. Token input is held in memory and excluded from persistence and export.
- Theme, density, and reduced-motion controls preview their effects within Settings. The sidebar preference is recorded for the future launcher integration.

## Mock boundaries

Java/RAM/filesystem/Docker detection, cache statistics, garden contents, accounts, share codes, snapshots, and maintenance results are sample data. No native settings commands, authentication requests, downloads, Docker operations, hooks, or file deletion are performed. Directory reveal actions display a sample location.

Pruning, cache and skin clears, share-code regeneration, account removal, section resets, and shorter retention windows show consequences before applying a simulated result. Preferences exports contain user-entered paths and commands; debug bundle exports contain synthetic redacted diagnostics only.

## Verification

```text
pnpm build
pnpm exec playwright test --config tests/settings.playwright.config.ts
```

The browser fixture mounts the actual launcher shell with mocked native startup responses. The checks cover all categories, search, persistence, cascades, memory constraints, action cancellation and focus restoration, per-layer cache clears, remote-refresh opt-in, theme/contrast preview, narrow layouts, retention previews, token handling, per-instance codes, and import/export.
