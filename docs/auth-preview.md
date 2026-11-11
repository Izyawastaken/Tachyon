# Account sign-in preview

The sidebar's Login entry opens a Microsoft-style sign-in page. The mock adapter returns `TachyonPlayer` after a short delay. The page supports cancellation, retryable errors, a signed-in profile, and sign-out. Leaving the page cancels a pending sign-in; completed sessions survive page navigation but reset when the app reloads. The sidebar shows the signed-in profile and opens the account page.

This is a UI preview only: it opens no browser, collects no credentials, stores no tokens, and does not establish Minecraft ownership or enable account skin sync. The page labels the demo in both signed-out and signed-in states.

## Replacing the mock with Rust

`src/features/auth/api.ts` defines the asynchronous `AuthClient` interface; `useAuth.ts` owns UI state and cancellation. `Shell` accepts an optional `authClient` and defaults to `mockAuthClient`. Supply a Rust-backed adapter at that boundary when implementing real authentication. The current `mock-microsoft` provider is an explicit demo discriminator; extend the session type for real profiles then. Keep credentials, tokens, refresh, ownership checks, and persistence in Rust. Cancellation uses `AbortSignal`; the adapter should also cancel its underlying Rust operation. Late results are discarded even if an adapter ignores cancellation.

## Verification

Run `pnpm exec playwright test --config tests/auth.playwright.config.ts`. Coverage includes the production entry point, profile navigation, sign-out, reload reset, cancellation races, leaving during sign-in, failed sign-in/sign-out retries, keyboard activation, reduced motion, and narrow/short layouts. Screenshots are written under `tests/generated/`.
