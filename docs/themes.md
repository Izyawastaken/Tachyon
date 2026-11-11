# Themes and Canvas

Themes is pinned directly above Settings in the sidebar and is also available through Spotlight. The collection has five starting palettes: Espresso, Sakura Milk, Almond Milk, Dusk Crimson, and Deep Plum. Selecting a collection theme applies it across the launcher and persists it on this device.

Canvas edits six roles: background, surface, raised surface, border, accent, and text. It adapts the user-supplied root `colorpicker.tsx` in `src/features/themes/ColorPicker.tsx`, using the existing icon and motion dependencies. The supplied root file is preserved. The editor supports solid, opaque colors; it intentionally disables gradient and opacity controls for palette roles.

## Drafts and saved themes

- Editing colors only changes the Canvas preview. The rest of the app keeps the applied theme.
- Drafts are restored from session storage. Saved custom themes and the applied theme are stored under the versioned local storage key `tachyon.themes.v1`.
- Save theme adds or updates a custom theme. Editing an already applied custom palette and saving without applying creates a copy, preserving the live palette.
- Save & apply explicitly saves and applies the edited palette.
- Reset restores the selected starting palette. Export downloads the six colors as JSON.
- Deleting a custom theme requires confirmation; deleting the applied theme restores Espresso.
- Unavailable device storage is reported, with export offered to preserve a copy. Invalid stored colors and unknown theme IDs are discarded.

## Color system

`model.ts` defines palette roles, presets, validation, and contrast calculations. `ThemeProvider.tsx` applies the selected palette and appearance preferences to the document root. `theme-bridge.css` maps shared component roles such as popover, card, muted, input, and ring to the launcher palette. Foregrounds on filled accents are selected by contrast. Functional status colors remain separate.

The preview reports text contrast against the background and surface. Its AA badge covers those two text pairs only; it does not claim that arbitrary custom palettes pass every accessibility check.

## Shader integration and motion

`PaletteStudy` in `ThemesPage.tsx` is a CSS palette study, not a shader. Replace it with the supplied renderer when available. Its container exposes `data-shader-slot`, and the six colors are available as theme variables. Only one study is rendered at a time, in the compact or expanded preview; a future renderer should preserve any state it needs across that move.

Motion handles spring responses for swatches and picker cells, picker opening and dismissal, collection selection, tabs, notifications, and the shared `layoutId` preview expansion. The expanded preview uses a modal dialog with Escape dismissal, keyboard focus containment, and focus restoration. Reduced-motion preferences simplify movement. Themes is loaded on demand, so the color picker stays out of the initial launcher bundle.

## Verification

- `pnpm build`
- `pnpm exec playwright test --config tests/themes.playwright.config.ts`
- `pnpm exec playwright test --config tests/settings.playwright.config.ts`

Theme browser tests reuse the mocked launcher in `tests/settings-preview.html`; no native account or launcher operations are performed.

## Comfort and layout

Reduced motion, interface density, and the default sidebar state now live in Themes. They persist with the theme library and apply across the launcher. Existing values migrate from the former Settings Appearance section once. Reduced motion also affects Spotlight, Settings navigation, Canvas, and the shell; the system setting is always respected. The sidebar preference sets its initial state on the next launch.
