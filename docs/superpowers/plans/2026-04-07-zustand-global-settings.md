# Zustand Global Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current custom Weibo rewrite settings store with a single app-level `zustand` store that persists theme, rewrite toggle, and `for-you` or `following` tab selection.

**Architecture:** Keep route state and page request state out of the global store. Evolve `src/lib/app-settings.ts` into the single persisted settings schema, then build a `zustand` vanilla store in `src/lib/app-settings-store.ts` so both React components and non-React content script code can subscribe to the same state source. Wire the Weibo shell and React app to that store, then delete the legacy rewrite settings module.

**Tech Stack:** TypeScript, React 19, WXT, `browser.storage.local`, Zustand, Vitest, Testing Library

---

## File Structure

### Create

- `src/lib/app-settings.test.ts`
  Verifies app settings normalization, load, persist, and dark mode resolution.
- `src/lib/app-settings-store.ts`
  Defines the app-level `zustand` vanilla store, singleton getter, React hook, and write actions.
- `src/lib/app-settings-store.test.ts`
  Verifies hydration and action persistence behavior for the `zustand` store.
- `src/features/weibo/content/shell-state.ts`
  Encapsulates subscribing the mounted Weibo shell to app settings for dark class and page takeover.
- `src/features/weibo/content/shell-state.test.ts`
  Verifies shell theme and rewrite toggle behavior against the shared store.
- `src/features/weibo/app/app-shell.test.tsx`
  Verifies React integration, especially `for-you` and `following` tab writes to the global store.

### Modify

- `package.json`
  Add the `zustand` dependency.
- `pnpm-lock.yaml`
  Lock the new dependency.
- `src/lib/app-settings.ts`
  Replace the old `language` and `appearance` schema with the persisted global settings schema used by the Weibo rewrite.
- `src/entrypoints/options/theme.ts`
  Rename the imported theme type from `AppAppearance` to `AppTheme`.
- `src/entrypoints/weibo.content.tsx`
  Initialize the app settings store, hydrate it, and bind the shell to the shared store.
- `src/features/weibo/app/app-root.tsx`
  Stop receiving a custom settings store prop and read settings from the app-level `zustand` store.
- `src/features/weibo/app/app-shell.tsx`
  Read settings from the `zustand` store and dispatch actions instead of consuming settings props.
- `src/features/weibo/components/navigation-rail.tsx`
  Replace `RewriteSettings` imports with app-level theme and setting props.

### Delete

- `src/features/weibo/settings/rewrite-settings.ts`
  Remove the obsolete custom persisted settings store.
- `src/features/weibo/settings/rewrite-settings.test.ts`
  Remove tests for the obsolete store.

## Task 1: Replace the persisted settings schema and add tests

**Files:**
- Create: `src/lib/app-settings.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/lib/app-settings.ts`
- Modify: `src/entrypoints/options/theme.ts`

- [ ] **Step 1: Add a failing test for the new persisted settings schema**

```ts
import { describe, expect, it, vi } from 'vitest'

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  normalizeAppSettings,
  persistAppSettings,
  resolveIsDarkMode,
} from '@/lib/app-settings'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: vi.fn(async () => ({
      [APP_SETTINGS_STORAGE_KEY]: stored,
    })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      stored = items[APP_SETTINGS_STORAGE_KEY]
    }),
    read() {
      return stored
    },
  }
}

describe('app-settings', () => {
  it('normalizes invalid values to the defaults', () => {
    expect(normalizeAppSettings(null)).toEqual(DEFAULT_APP_SETTINGS)
    expect(normalizeAppSettings({
      theme: 'neon',
      rewriteEnabled: 'yes',
      homeTimelineTab: 'friends',
    })).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('loads and persists settings through storage', async () => {
    const storage = createStorageArea({
      theme: 'dark',
      rewriteEnabled: false,
      homeTimelineTab: 'following',
    })

    expect(await loadAppSettings(storage)).toEqual({
      theme: 'dark',
      rewriteEnabled: false,
      homeTimelineTab: 'following',
    })

    await persistAppSettings({
      theme: 'light',
      rewriteEnabled: true,
      homeTimelineTab: 'for-you',
    }, storage)

    expect(storage.read()).toEqual({
      theme: 'light',
      rewriteEnabled: true,
      homeTimelineTab: 'for-you',
    })
  })

  it('resolves dark mode from theme preference', () => {
    expect(resolveIsDarkMode('dark', false)).toBe(true)
    expect(resolveIsDarkMode('light', true)).toBe(false)
    expect(resolveIsDarkMode('system', true)).toBe(true)
    expect(resolveIsDarkMode('system', false)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the new test file and verify it fails**

Run: `pnpm test:unit src/lib/app-settings.test.ts`

Expected: FAIL with missing exports such as `DEFAULT_APP_SETTINGS`, `loadAppSettings`, or schema mismatch around `language` and `appearance`.

- [ ] **Step 3: Install Zustand and rewrite the persisted settings module**

Run: `pnpm add zustand`

Expected: `package.json` and `pnpm-lock.yaml` update with `zustand` added under dependencies.

Update `src/lib/app-settings.ts` to this shape:

```ts
import type { HomeTimelineTab } from '@/features/weibo/services/weibo-repository'

export type AppTheme = 'system' | 'light' | 'dark'

export interface AppSettings {
  theme: AppTheme
  rewriteEnabled: boolean
  homeTimelineTab: HomeTimelineTab
}

export interface AppSettingsStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

export const APP_SETTINGS_STORAGE_KEY = 'loveforxb:app-settings'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  rewriteEnabled: true,
  homeTimelineTab: 'for-you',
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isHomeTimelineTab(value: unknown): value is HomeTimelineTab {
  return value === 'for-you' || value === 'following'
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APP_SETTINGS }
  }

  const candidate = value as Partial<AppSettings>

  return {
    theme: isAppTheme(candidate.theme)
      ? candidate.theme
      : DEFAULT_APP_SETTINGS.theme,
    rewriteEnabled: typeof candidate.rewriteEnabled === 'boolean'
      ? candidate.rewriteEnabled
      : DEFAULT_APP_SETTINGS.rewriteEnabled,
    homeTimelineTab: isHomeTimelineTab(candidate.homeTimelineTab)
      ? candidate.homeTimelineTab
      : DEFAULT_APP_SETTINGS.homeTimelineTab,
  }
}

export function resolveIsDarkMode(theme: AppTheme, prefersDark: boolean): boolean {
  if (theme === 'dark') {
    return true
  }

  if (theme === 'light') {
    return false
  }

  return prefersDark
}

export async function loadAppSettings(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): Promise<AppSettings> {
  const stored = await storageArea.get(APP_SETTINGS_STORAGE_KEY)
  return normalizeAppSettings(stored[APP_SETTINGS_STORAGE_KEY])
}

export async function persistAppSettings(
  nextValue: AppSettings,
  storageArea: AppSettingsStorageArea = browser.storage.local,
): Promise<AppSettings> {
  const normalized = normalizeAppSettings(nextValue)

  await storageArea.set({
    [APP_SETTINGS_STORAGE_KEY]: normalized,
  })

  return normalized
}
```

Update `src/entrypoints/options/theme.ts` to use the new type name:

```ts
import { AppTheme } from '@/lib/app-settings'

export type ThemeMode = 'light' | 'dark'

export function resolveThemeMode(theme: AppTheme, systemPrefersDark: boolean): ThemeMode {
  if (theme === 'light') {
    return 'light'
  }

  if (theme === 'dark') {
    return 'dark'
  }

  return systemPrefersDark ? 'dark' : 'light'
}
```

- [ ] **Step 4: Run the settings test again and verify it passes**

Run: `pnpm test:unit src/lib/app-settings.test.ts`

Expected: PASS with 3 tests passing.

- [ ] **Step 5: Commit the schema update**

```bash
git add package.json pnpm-lock.yaml src/lib/app-settings.ts src/lib/app-settings.test.ts src/entrypoints/options/theme.ts
git commit -m "feat: add persisted app settings schema"
```

## Task 2: Add the app-level Zustand store and tests

**Files:**
- Create: `src/lib/app-settings-store.ts`
- Create: `src/lib/app-settings-store.test.ts`

- [ ] **Step 1: Add a failing store test for hydrate and write actions**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppSettingsStore } from '@/lib/app-settings-store'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: vi.fn(async () => ({
      'loveforxb:app-settings': stored,
    })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      stored = items['loveforxb:app-settings']
    }),
    read() {
      return stored
    },
  }
}

describe('app-settings-store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates persisted settings into the store', async () => {
    const storage = createStorageArea({
      theme: 'dark',
      rewriteEnabled: false,
      homeTimelineTab: 'following',
    })
    const store = createAppSettingsStore(storage)

    await store.getState().hydrate()

    expect(store.getState()).toMatchObject({
      theme: 'dark',
      rewriteEnabled: false,
      homeTimelineTab: 'following',
      isHydrated: true,
    })
  })

  it('updates memory first and persists tab changes', async () => {
    const storage = createStorageArea()
    const store = createAppSettingsStore(storage)

    await store.getState().setHomeTimelineTab('following')

    expect(store.getState().homeTimelineTab).toBe('following')
    expect(storage.read()).toEqual({
      theme: 'system',
      rewriteEnabled: true,
      homeTimelineTab: 'following',
    })
  })
})
```

- [ ] **Step 2: Run the store test and verify it fails**

Run: `pnpm test:unit src/lib/app-settings-store.test.ts`

Expected: FAIL because `src/lib/app-settings-store.ts` does not exist yet.

- [ ] **Step 3: Implement the Zustand vanilla store, singleton getter, and hook**

Create `src/lib/app-settings-store.ts`:

```ts
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  persistAppSettings,
  type AppSettings,
  type AppSettingsStorageArea,
  type AppTheme,
} from '@/lib/app-settings'

type PersistedAppSettings = AppSettings

export interface AppSettingsStoreState extends AppSettings {
  isHydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setRewriteEnabled: (enabled: boolean) => Promise<void>
  setHomeTimelineTab: (tab: AppSettings['homeTimelineTab']) => Promise<void>
}

export type AppSettingsStore = StoreApi<AppSettingsStoreState>

function toPersistedSettings(state: AppSettingsStoreState): PersistedAppSettings {
  return {
    theme: state.theme,
    rewriteEnabled: state.rewriteEnabled,
    homeTimelineTab: state.homeTimelineTab,
  }
}

export function createAppSettingsStore(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): AppSettingsStore {
  return createStore<AppSettingsStoreState>((set, get) => {
    async function updateAndPersist(patch: Partial<PersistedAppSettings>) {
      set(patch)
      await persistAppSettings({
        ...toPersistedSettings(get()),
        ...patch,
      }, storageArea)
    }

    return {
      ...DEFAULT_APP_SETTINGS,
      isHydrated: false,
      async hydrate() {
        const settings = await loadAppSettings(storageArea)
        set({
          ...settings,
          isHydrated: true,
        })
      },
      async setTheme(theme) {
        await updateAndPersist({ theme })
      },
      async setRewriteEnabled(rewriteEnabled) {
        await updateAndPersist({ rewriteEnabled })
      },
      async setHomeTimelineTab(homeTimelineTab) {
        await updateAndPersist({ homeTimelineTab })
      },
    }
  })
}

let appSettingsStore: AppSettingsStore | null = null

export function getAppSettingsStore(
  storageArea?: AppSettingsStorageArea,
): AppSettingsStore {
  if (!appSettingsStore) {
    appSettingsStore = createAppSettingsStore(storageArea)
  }

  return appSettingsStore
}

export function resetAppSettingsStoreForTest() {
  appSettingsStore = null
}

export function useAppSettings<T>(
  selector: (state: AppSettingsStoreState) => T,
): T {
  return useStore(getAppSettingsStore(), selector)
}
```

- [ ] **Step 4: Run the store test and verify it passes**

Run: `pnpm test:unit src/lib/app-settings-store.test.ts`

Expected: PASS with 2 tests passing.

- [ ] **Step 5: Commit the Zustand store**

```bash
git add src/lib/app-settings-store.ts src/lib/app-settings-store.test.ts
git commit -m "feat: add zustand app settings store"
```

## Task 3: Bind the Weibo shell to the shared store

**Files:**
- Create: `src/features/weibo/content/shell-state.ts`
- Create: `src/features/weibo/content/shell-state.test.ts`
- Modify: `src/entrypoints/weibo.content.tsx`

- [ ] **Step 1: Add a failing shell-state test**

```ts
import { describe, expect, it } from 'vitest'

import { bindShellState } from '@/features/weibo/content/shell-state'
import { createAppSettingsStore } from '@/lib/app-settings-store'

describe('bindShellState', () => {
  it('applies dark mode and rewrite takeover from the shared store', async () => {
    const container = document.createElement('div')
    const appRoot = document.createElement('div')
    const store = createAppSettingsStore({
      get: async () => ({ 'loveforxb:app-settings': undefined }),
      set: async () => {},
    })

    Object.defineProperty(window, 'matchMedia', {
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    })

    const cleanup = bindShellState({
      container,
      appRoot,
      settingsStore: store,
    })

    await store.getState().setTheme('dark')
    await store.getState().setRewriteEnabled(false)

    expect(container.classList.contains('dark')).toBe(true)
    expect(appRoot.getAttribute('data-loveforxb-hidden')).toBeNull()

    cleanup()
  })
})
```

- [ ] **Step 2: Run the shell-state test and verify it fails**

Run: `pnpm test:unit src/features/weibo/content/shell-state.test.ts`

Expected: FAIL because `src/features/weibo/content/shell-state.ts` does not exist yet.

- [ ] **Step 3: Extract shell binding logic and hydrate the store during mount**

Create `src/features/weibo/content/shell-state.ts`:

```ts
import { applyPageTakeover, clearPageTakeover } from '@/features/weibo/content/page-takeover'
import { resolveIsDarkMode } from '@/lib/app-settings'
import type { AppSettingsStore } from '@/lib/app-settings-store'

export function bindShellState({
  container,
  appRoot,
  settingsStore,
}: {
  container: HTMLElement
  appRoot: HTMLElement
  settingsStore: AppSettingsStore
}) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const applyShellState = () => {
    const settings = settingsStore.getState()
    const isDark = resolveIsDarkMode(settings.theme, mediaQuery.matches)

    container.classList.toggle('dark', isDark)

    if (settings.rewriteEnabled) {
      applyPageTakeover(appRoot)
      return
    }

    clearPageTakeover(appRoot)
  }

  const unsubscribe = settingsStore.subscribe(applyShellState)
  const onSystemThemeChange = () => applyShellState()

  applyShellState()
  mediaQuery.addEventListener('change', onSystemThemeChange)

  return () => {
    unsubscribe()
    mediaQuery.removeEventListener('change', onSystemThemeChange)
    clearPageTakeover(appRoot)
  }
}
```

Replace the imports, mounted UI shape, and mount logic in `src/entrypoints/weibo.content.tsx` with:

```ts
import { bindShellState } from '@/features/weibo/content/shell-state'
import { getAppSettingsStore } from '@/lib/app-settings-store'

interface MountedWeiboUi {
  pageStore: PageStore
  root: Root
  cleanup: () => void
}

async main(ctx) {
  await injectScript('/weibo-main-world.js', { keepInDom: true })

  const regions = findWeiboHostRegions(document)
  if (!regions) {
    return
  }

  const settingsStore = getAppSettingsStore()
  await settingsStore.getState().hydrate()

  const ui = await createShadowRootUi(ctx, {
    name: 'loveforxb-shell',
    position: 'inline',
    anchor: 'body',
    append: 'first',
    onMount(container) {
      const pageStore = createPageStore()
      const cleanup = bindShellState({
        container,
        appRoot: regions.appRoot,
        settingsStore,
      })
      const root = createRoot(container)
      root.render(<AppRoot pageStore={pageStore} />)
      return { cleanup, pageStore, root }
    },
    onRemove(mounted?: MountedWeiboUi) {
      mounted?.cleanup()
      mounted?.pageStore.dispose()
      mounted?.root.unmount()
    },
  })

  ui.mount()
}
```

- [ ] **Step 4: Run the shell-state test and verify it passes**

Run: `pnpm test:unit src/features/weibo/content/shell-state.test.ts`

Expected: PASS with 1 test passing.

- [ ] **Step 5: Commit the shell integration**

```bash
git add src/features/weibo/content/shell-state.ts src/features/weibo/content/shell-state.test.ts src/entrypoints/weibo.content.tsx
git commit -m "refactor: bind weibo shell to app settings store"
```

## Task 4: Refactor the React app to consume the Zustand store

**Files:**
- Create: `src/features/weibo/app/app-shell.test.tsx`
- Modify: `src/features/weibo/app/app-root.tsx`
- Modify: `src/features/weibo/app/app-shell.tsx`
- Modify: `src/features/weibo/components/navigation-rail.tsx`

- [ ] **Step 1: Add a failing React integration test for timeline tab persistence**

```ts
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    loadHomeTimeline: vi.fn(async () => ({
      items: [],
      nextCursor: null,
    })),
    loadProfileInfo: vi.fn(),
    loadProfilePosts: vi.fn(),
    loadStatusDetail: vi.fn(),
  }
})

describe('AppShell', () => {
  beforeEach(() => {
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ 'loveforxb:app-settings': undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      isHydrated: true,
    })
  })

  it('writes the selected home timeline tab into the global settings store', async () => {
    render(<AppShell page={{ kind: 'home', tab: 'for-you' }} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Following' }))

    await waitFor(() => {
      expect(getAppSettingsStore().getState().homeTimelineTab).toBe('following')
    })
  })
})
```

- [ ] **Step 2: Run the React integration test and verify it fails**

Run: `pnpm test:unit src/features/weibo/app/app-shell.test.tsx`

Expected: FAIL because `AppShell` still expects settings props and does not use the shared store.

- [ ] **Step 3: Remove settings prop drilling and wire the React tree to the store**

Update `src/features/weibo/app/app-root.tsx`:

```tsx
import { useSyncExternalStore } from 'react'

import { AppShell } from '@/features/weibo/app/app-shell'
import type { PageStore } from '@/features/weibo/app/page-store'

export function AppRoot({
  pageStore,
}: {
  pageStore: PageStore
}) {
  const page = useSyncExternalStore(pageStore.subscribe, pageStore.getSnapshot)

  return <AppShell page={page} />
}
```

Update the settings-related parts of `src/features/weibo/app/app-shell.tsx`:

```tsx
import { useAppSettings } from '@/lib/app-settings-store'
import type { AppTheme } from '@/lib/app-settings'

function ShellFrame({
  pageKind,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  children,
}: {
  pageKind: WeiboPageDescriptor['kind']
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[280px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
        <NavigationRail
          pageKind={pageKind}
          rewriteEnabled={rewriteEnabled}
          theme={theme}
          onRewriteEnabledChange={onRewriteEnabledChange}
          onThemeChange={onThemeChange}
        />
        <div className="min-w-0">{children}</div>
        <RightRail />
      </div>
    </div>
  )
}

export function AppShell({
  page,
}: {
  page: WeiboPageDescriptor
}) {
  const theme = useAppSettings((state) => state.theme)
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const activeTimelineTab = useAppSettings((state) => state.homeTimelineTab)
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled)
  const setHomeTimelineTab = useAppSettings((state) => state.setHomeTimelineTab)
  const setTheme = useAppSettings((state) => state.setTheme)

  if (!rewriteEnabled) {
    return <RewritePausedCard onResume={() => void setRewriteEnabled(true)} />
  }

  if (page.kind === 'home') {
    return (
      <ShellFrame
        pageKind={page.kind}
        theme={theme}
        rewriteEnabled={rewriteEnabled}
        onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
        onThemeChange={(nextTheme) => void setTheme(nextTheme)}
      >
        <HomeTimelinePage
          activeTab={activeTimelineTab}
          errorMessage={timelineError}
          isLoading={isTimelineLoading}
          onRetry={retryTimeline}
          onTabChange={(tab) => void setHomeTimelineTab(tab)}
          page={timelinePage}
        />
      </ShellFrame>
    )
  }
}
```

Update `src/features/weibo/components/navigation-rail.tsx` to use app-level types:

```tsx
import type { AppTheme } from '@/lib/app-settings'

const THEME_ITEMS: Array<{
  icon: typeof SunMoon
  label: string
  value: AppTheme
}> = [
  { icon: SunMoon, label: 'System', value: 'system' },
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: MoonStar, label: 'Dark', value: 'dark' },
]

export function NavigationRail({
  pageKind,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
}: {
  pageKind: WeiboPageDescriptor['kind']
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
}) {
  return (
    <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">LoveForXb</CardTitle>
        <CardDescription>Weibo, rebuilt for reading</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map(({ icon: Icon, label, pageKinds }) => {
            const isActive = pageKinds.some((candidate) => candidate === pageKind)

            return (
              <div
                key={label}
                className={[
                  'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Rewrite Weibo</p>
              <p className="text-xs text-muted-foreground">
                Toggle back to the original page without leaving the tab.
              </p>
            </div>
            <Switch
              checked={rewriteEnabled}
              aria-label="Toggle LoveForXb rewrite"
              onCheckedChange={onRewriteEnabledChange}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Theme
            </p>
            <ToggleGroup
              type="single"
              value={theme}
              variant="outline"
              className="grid w-full grid-cols-3"
              onValueChange={(value) => {
                if (value) {
                  onThemeChange(value as AppTheme)
                }
              }}
            >
              {THEME_ITEMS.map(({ icon: Icon, label, value }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex min-w-0 flex-col gap-1 px-2 py-2 text-[11px]"
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run the React integration test and verify it passes**

Run: `pnpm test:unit src/features/weibo/app/app-shell.test.tsx`

Expected: PASS with 1 test passing.

- [ ] **Step 5: Commit the React refactor**

```bash
git add src/features/weibo/app/app-root.tsx src/features/weibo/app/app-shell.tsx src/features/weibo/components/navigation-rail.tsx src/features/weibo/app/app-shell.test.tsx
git commit -m "refactor: consume app settings from zustand"
```

## Task 5: Remove the legacy rewrite settings store and run regression checks

**Files:**
- Delete: `src/features/weibo/settings/rewrite-settings.ts`
- Delete: `src/features/weibo/settings/rewrite-settings.test.ts`

- [ ] **Step 1: Remove the obsolete rewrite settings module and test**

Run:

```bash
rm src/features/weibo/settings/rewrite-settings.ts
rm src/features/weibo/settings/rewrite-settings.test.ts
```

Expected: both legacy files are deleted because all imports have been migrated to `src/lib/app-settings.ts` and `src/lib/app-settings-store.ts`.

- [ ] **Step 2: Run focused regression tests**

Run:

```bash
pnpm test:unit \
  src/lib/app-settings.test.ts \
  src/lib/app-settings-store.test.ts \
  src/features/weibo/content/shell-state.test.ts \
  src/features/weibo/app/app-shell.test.tsx \
  src/features/weibo/pages/home-timeline-page.test.tsx \
  src/features/weibo/services/weibo-repository.test.ts
```

Expected: PASS with all listed test files green.

- [ ] **Step 3: Run type checking**

Run: `pnpm compile`

Expected: PASS with `tsc --noEmit` exiting 0.

- [ ] **Step 4: Run the full unit test suite**

Run: `pnpm test:unit`

Expected: PASS with the project test suite green.

- [ ] **Step 5: Commit the cleanup and verification**

```bash
git add -A
git commit -m "refactor: replace legacy rewrite settings store"
```

## Self-Review

### Spec coverage

- App-level `zustand` store: covered by Task 2
- Flat settings shape with theme, rewrite toggle, and home timeline tab: covered by Task 1 and Task 2
- Explicit storage sync with `browser.storage.local`: covered by Task 1 and Task 2
- Keep route state separate: preserved in Task 3 and Task 4
- Keep request state local: preserved in Task 4
- Remove old rewrite settings store: covered by Task 5

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers remain
- All test steps include concrete test code or exact commands
- All implementation steps name exact files and exported symbols

### Type consistency

- Shared setting type is `AppTheme`
- Persisted shape is `AppSettings`
- Global store entry points are `createAppSettingsStore`, `getAppSettingsStore`, and `useAppSettings`
- Write actions are `setTheme`, `setRewriteEnabled`, and `setHomeTimelineTab`
