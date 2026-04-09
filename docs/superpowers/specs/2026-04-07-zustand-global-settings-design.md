# Zustand Global Settings Design

Date: 2026-04-07
Status: Approved in conversation, pending user review of written spec

## Goal

Replace the current custom persisted settings store with a single app-level `zustand` store for shared user settings.

The new store will manage only settings-type global state:
- Theme selection
- Rewrite enabled or disabled
- Home timeline tab selection: `for-you` or `following`

The store must synchronize with persisted browser storage so settings survive page reloads and future visits.

## Non-Goals

This change will not:
- Move route state into `zustand`
- Move request, loading, or error state for timeline, profile, or status pages into `zustand`
- Preserve compatibility with the old rewrite settings storage key
- Introduce feature slices or a nested `features.weibo` namespace

## Design Decisions

### Single app-level settings store

The application only targets Weibo, so the global settings shape should stay flat rather than pretending to support multiple site adapters.

Chosen state shape:

```ts
type AppSettingsState = {
  theme: 'system' | 'light' | 'dark'
  rewriteEnabled: boolean
  homeTimelineTab: 'for-you' | 'following'
  isHydrated: boolean
}
```

This keeps selectors short and avoids unnecessary nesting.

### Settings only

`zustand` is used only for cross-component and cross-page settings.

The following remain outside the global settings store:
- Current route descriptor
- Timeline request state
- Profile request state
- Status detail request state

This keeps the store focused on durable user preferences rather than transient runtime data.

### New storage key

The new implementation writes a fresh app-level storage record and does not read the old rewrite settings key.

Proposed key:

```ts
const APP_SETTINGS_STORAGE_KEY = 'xb:app-settings'
```

## Store Architecture

The implementation is split into two modules.

### `src/lib/app-settings.ts`

Responsibilities:
- Declare the `AppSettings` type
- Provide the default settings object
- Normalize unknown persisted data
- Load settings from `browser.storage.local`
- Persist settings to `browser.storage.local`

Recommended defaults:

```ts
const DEFAULT_APP_SETTINGS = {
  theme: 'system',
  rewriteEnabled: true,
  homeTimelineTab: 'for-you',
}
```

Normalization rules:
- Invalid or missing `theme` falls back to `system`
- Invalid or missing `rewriteEnabled` falls back to `true`
- Invalid or missing `homeTimelineTab` falls back to `for-you`

### `src/lib/app-settings-store.ts`

Responsibilities:
- Create the app-level `zustand` store
- Expose read selectors and write actions
- Hydrate persisted settings on startup
- Keep in-memory state and browser storage in sync

Recommended action shape:

```ts
type AppSettingsActions = {
  hydrate(): Promise<void>
  setTheme(theme: AppSettings['theme']): Promise<void>
  setRewriteEnabled(enabled: boolean): Promise<void>
  setHomeTimelineTab(tab: AppSettings['homeTimelineTab']): Promise<void>
}
```

Implementation rules:
- Update in-memory state first for immediate UI response
- Persist asynchronously after state update
- Mark `isHydrated` once persisted state has been loaded and normalized

## Data Flow

Startup flow:

1. Content script creates the app settings store with default values.
2. Content script calls `hydrate()`.
3. Persisted settings are loaded from `browser.storage.local`.
4. Loaded values are normalized and written into the store.
5. `isHydrated` flips to `true`.

Update flow:

1. A component calls a store action such as `setTheme`.
2. The store updates in memory immediately.
3. The store persists the normalized snapshot to `browser.storage.local`.

This keeps interaction responsive while preserving persistence.

## Integration Plan

### Content script entrypoint

Update the Weibo content script entrypoint to initialize the new app settings store and trigger hydration during mount.

`bindShellState` should subscribe to the `zustand` app settings store rather than the current rewrite settings store.

### AppRoot

Remove settings store props from `AppRoot`.

`AppRoot` should read from the app settings store directly using selectors rather than receiving a custom external store from above.

### AppShell

Remove the current settings prop drilling:
- `settings`
- `onRewriteEnabledChange`
- `onThemeChange`
- `onHomeTimelineTabChange`

`AppShell` should read settings directly from the `zustand` store and call store actions for updates.

Existing local component state for fetched page data remains unchanged.

### Route store

Keep the existing route store as a separate runtime state source.

No route data should be persisted or merged into the app settings store.

## Persistence Strategy

The implementation should use explicit `load` and `persist` helpers rather than `zustand`'s built-in `persist` middleware.

Reasoning:
- The environment uses browser extension storage, not plain synchronous `localStorage`
- Explicit hydration is easier to control in tests
- Storage logic stays readable and decoupled from the React integration layer

## Testing Strategy

Add or update tests in three areas.

### `src/lib/app-settings.ts`

Cover:
- Default normalization
- Invalid value fallback
- Load behavior from mocked storage
- Persist behavior to mocked storage

### `src/lib/app-settings-store.ts`

Cover:
- Initial default snapshot
- `hydrate()` updates state from storage
- `setTheme()` updates memory and persists
- `setRewriteEnabled()` updates memory and persists
- `setHomeTimelineTab()` updates memory and persists

### Integration tests

Cover:
- `AppRoot` or `AppShell` reads settings from the new store
- Switching `for-you` and `following` updates the global settings store
- Shell theme and rewrite toggle behavior react to store updates

## Risks And Mitigations

### Default-value flash before hydration

Risk:
- The UI may briefly render with defaults before persisted settings load

Mitigation:
- Accept this for v1 because defaults are valid and hydration should be fast
- Keep `isHydrated` available if a later refinement needs to gate specific UI behavior

### Store lifecycle leaks

Risk:
- Content script remounts or hot reloads may leave stale subscriptions behind

Mitigation:
- Keep an explicit unsubscribe path for shell bindings
- Ensure the content script cleanup removes all store listeners on unmount

## Explicit Assumptions

The following assumptions are locked for this change unless new facts force a revision:

- The app will continue to target only Weibo
- Global settings state should stay flat, not nested by feature
- Route state remains separate from persisted settings
- Request and page data remain local to the page components
- Old persisted rewrite settings do not need migration
