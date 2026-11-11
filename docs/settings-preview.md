# Settings UI preview

Open **Settings** with the gear in the launcher sidebar. The twelve categories cover launcher preferences, Java, instance defaults, network, storage, caching, sharing, servers, appearance, accounts, diagnostics, and advanced configuration.

## Interaction model

- Categories live in a horizontal gooey navigation ribbon. Its selection and trailing droplet use interruptible springs, with SVG filtering confined to the background shapes so labels stay sharp. Use Left/Right, Home, and End when a navigation button is focused.
- Open the launcher-wide **CMDK Spotlight** with **Ctrl+Space** on Windows/Linux or **Option+Space** on Mac. The header’s **Find a setting** button and launcher Quick search also open it. The palette rises from the bottom at 75% scale and springs to 100%; Escape, the shortcut, or an outside click dismisses it.
- Settings search requires a leading dot: `. JVM`, `. memory`, `. theme`, or `. prune`. Without the prefix, Spotlight offers launcher destinations. Arrow keys select results; Enter reveals the selected setting’s category, scrolls it into view, highlights it, and focuses the edit control. Disabled controls are revealed without changing their prerequisite preferences.
- Spotlight uses CMDK for fuzzy ranking and keyboard selection, Motion for entry/exit, and a native modal dialog for focus containment. Selection navigates after the exit animation so closing the dialog cannot steal focus back from the setting. Maintenance dialogs take priority over the global shortcut.
- The scope picker switches between global defaults and three sample instances. Game settings show **Inherited** or **Overridden**, with a reset action. Launcher-wide settings are marked when viewing an instance.
- Memory minimum and maximum form a pair: overriding either captures both values so later global edits cannot invalidate the instance’s range. Resetting either restores the inherited pair.
- Preferences persist separately from real launcher configuration under `tachyon.settings-preview.v1` in browser storage. Settings JSON imports are validated and previewed before replacement. Token input is held in memory and excluded from persistence and export.
- Theme and density controls preview their effects within Settings. The local reduced-motion preference and system preference suppress the gooey trail and movement; Spotlight also honors both. The launcher sidebar preference is recorded for future integration.

## Mock boundaries

Java/RAM/filesystem/Docker detection, cache statistics, garden contents, accounts, share codes, snapshots, and maintenance results are sample data. No native settings commands, authentication requests, downloads, Docker operations, hooks, or file deletion are performed. Directory reveal actions display a sample location.

Pruning, cache and skin clears, share-code regeneration, account removal, section resets, and shorter retention windows show consequences before applying a simulated result. Preferences exports contain user-entered paths and commands; debug bundle exports contain synthetic redacted diagnostics only.

## Verification

```text
pnpm build
pnpm exec playwright test --config tests/settings.playwright.config.ts
```

The browser fixture mounts the actual launcher shell with mocked native startup responses. The checks cover all categories, global prefix search, result navigation and focus, both platform shortcuts, keyboard navigation in the gooey ribbon, persistence, cascades, memory constraints, action cancellation and focus restoration, per-layer cache clears, remote-refresh opt-in, theme/contrast preview, narrow layouts, retention previews, token handling, per-instance codes, and import/export.
