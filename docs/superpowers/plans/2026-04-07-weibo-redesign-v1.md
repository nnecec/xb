# LoveForXb Weibo Redesign V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WXT-based browser extension that rewrites Weibo home, status detail, and profile pages into a ShadowRoot-isolated React UI with dark mode and a reliable fallback to the original Weibo page.

**Architecture:** Use a `defineContentScript` entrypoint as the parent controller, inject a tiny unlisted main-world script for history bridging, and render the new UI with `createShadowRootUi`. Keep page logic in a `src/features/weibo` slice with strict boundaries between route parsing, page takeover, API adapters, page components, and persisted settings.

**Tech Stack:** WXT 0.20, React 19, TypeScript 6, Vitest, Testing Library, Tailwind CSS v4, shadcn/ui, browser storage APIs

---

## File Structure

- `src/entrypoints/weibo.content.tsx`
  Registers the Weibo content script, injects the main-world bridge, and mounts the ShadowRoot UI.
- `src/entrypoints/weibo-main-world.ts`
  Unlisted script that patches `history.pushState` and `history.replaceState` and posts route events back to the content script.
- `src/features/weibo/platform/messages.ts`
  Shared bridge event names, payload types, and type guards for content-script/main-world communication.
- `src/features/weibo/route/page-descriptor.ts`
  Internal route model for supported Weibo pages.
- `src/features/weibo/route/parse-weibo-url.ts`
  Pure URL parser that maps native Weibo URLs to internal descriptors.
- `src/features/weibo/route/router-sync.ts`
  Binds browser route events to application state updates.
- `src/features/weibo/content/host-selectors.ts`
  Selectors and utilities for finding and hiding the original Weibo page regions safely.
- `src/features/weibo/content/page-takeover.ts`
  Applies and removes the takeover state on the host page.
- `src/features/weibo/app/page-store.ts`
  Lightweight store for current route, loading state, and page data.
- `src/features/weibo/app/app-root.tsx`
  Bootstraps React into the ShadowRoot container.
- `src/features/weibo/app/app-shell.tsx`
  Renders top-level layout and switches between page components.
- `src/features/weibo/models/feed.ts`
  Normalized feed item and timeline models.
- `src/features/weibo/models/status.ts`
  Normalized status detail models.
- `src/features/weibo/models/profile.ts`
  Normalized profile models.
- `src/features/weibo/services/client.ts`
  Shared fetch wrapper with timeout, JSON guards, and Weibo-specific headers.
- `src/features/weibo/services/endpoints.ts`
  Central endpoint definitions for timeline, status detail, profile, and side cards.
- `src/features/weibo/services/adapters/timeline.ts`
  Converts timeline payloads into normalized feed models.
- `src/features/weibo/services/adapters/status.ts`
  Converts status detail payloads into normalized status models.
- `src/features/weibo/services/adapters/profile.ts`
  Converts profile payloads into normalized profile models.
- `src/features/weibo/services/weibo-repository.ts`
  High-level page loaders built on endpoints and adapters.
- `src/features/weibo/components/navigation-rail.tsx`
  Compact left navigation rail.
- `src/features/weibo/components/feed-card.tsx`
  Reusable post card for home, detail, and profile lists.
- `src/features/weibo/components/right-rail.tsx`
  Right-side contextual panels and fallback content.
- `src/features/weibo/components/page-state.tsx`
  Shared loading, empty, and error views.
- `src/features/weibo/pages/home-timeline-page.tsx`
  Timeline page with `For You` and `Following` tabs.
- `src/features/weibo/pages/status-detail-page.tsx`
  Status detail page with main post and replies thread.
- `src/features/weibo/pages/profile-page.tsx`
  Profile page with header and `Posts`, `Replies`, `Media` tabs.
- `src/features/weibo/settings/rewrite-settings.ts`
  Persisted settings for rewrite enablement and appearance.
- `src/features/weibo/settings/rewrite-settings.test.ts`
  Settings normalization and persistence coverage.
- `src/test/setup.ts`
  Shared Vitest setup for DOM matchers.
- `wxt.config.ts`
  Updated extension metadata and host permissions for Weibo.
- `README.md`
  Updated product description and dev commands after implementation.

## Task 1: Route Model and Test Baseline

**Files:**
- Create: `src/test/setup.ts`
- Create: `src/features/weibo/route/page-descriptor.ts`
- Create: `src/features/weibo/route/parse-weibo-url.ts`
- Test: `src/features/weibo/route/parse-weibo-url.test.ts`

- [ ] **Step 1: Write the failing route parser test**

```ts
import { describe, expect, it } from 'vitest'

import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'

describe('parseWeiboUrl', () => {
  it('parses the home timeline', () => {
    expect(parseWeiboUrl('https://weibo.com/')).toEqual({
      kind: 'home',
      tab: 'for-you',
    })
  })

  it('parses a status detail URL', () => {
    expect(parseWeiboUrl('https://weibo.com/1969776354/PiR8A7d0z')).toEqual({
      kind: 'status',
      authorId: '1969776354',
      statusId: 'PiR8A7d0z',
    })
  })

  it('parses a profile URL', () => {
    expect(parseWeiboUrl('https://weibo.com/u/1969776354')).toEqual({
      kind: 'profile',
      profileId: '1969776354',
      profileSource: 'u',
      tab: 'posts',
    })
  })

  it('returns unsupported for unknown paths', () => {
    expect(parseWeiboUrl('https://weibo.com/settings')).toEqual({
      kind: 'unsupported',
      reason: 'unmatched-path',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- src/features/weibo/route/parse-weibo-url.test.ts`

Expected: FAIL with missing module errors for `parse-weibo-url` and a missing test setup file.

- [ ] **Step 3: Write the minimal route implementation and Vitest setup**

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

```ts
// src/features/weibo/route/page-descriptor.ts
export type WeiboPageDescriptor =
  | { kind: 'home'; tab: 'for-you' | 'following' }
  | { kind: 'status'; authorId: string; statusId: string }
  | { kind: 'profile'; profileId: string; profileSource: 'u' | 'n'; tab: 'posts' | 'replies' | 'media' }
  | { kind: 'unsupported'; reason: 'invalid-url' | 'unmatched-path' }
```

```ts
// src/features/weibo/route/parse-weibo-url.ts
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'

export function parseWeiboUrl(input: string): WeiboPageDescriptor {
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    return { kind: 'unsupported', reason: 'invalid-url' }
  }

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length === 0) {
    return { kind: 'home', tab: 'for-you' }
  }
  if (parts[0] === 'u' && parts[1]) {
    return { kind: 'profile', profileId: parts[1], profileSource: 'u', tab: 'posts' }
  }
  if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    return { kind: 'status', authorId: parts[0], statusId: parts[1] }
  }
  return { kind: 'unsupported', reason: 'unmatched-path' }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm postinstall`

Expected: PASS with WXT generating `.wxt` support files.

Run: `pnpm test:unit -- src/features/weibo/route/parse-weibo-url.test.ts`

Expected: PASS with 4 passing tests.

Run: `pnpm compile`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/test/setup.ts src/features/weibo/route/page-descriptor.ts src/features/weibo/route/parse-weibo-url.ts src/features/weibo/route/parse-weibo-url.test.ts
git commit -m "test: add weibo route parser baseline"
```

## Task 2: Main-World Bridge and Host Selectors

**Files:**
- Create: `src/features/weibo/platform/messages.ts`
- Create: `src/features/weibo/inject/install-history-bridge.ts`
- Create: `src/entrypoints/weibo-main-world.ts`
- Create: `src/features/weibo/content/host-selectors.ts`
- Test: `src/features/weibo/inject/install-history-bridge.test.ts`
- Test: `src/features/weibo/content/host-selectors.test.ts`

- [ ] **Step 1: Write failing tests for route bridge and selector resolution**

```ts
import { describe, expect, it, vi } from 'vitest'

import { installHistoryBridge } from '@/features/weibo/inject/install-history-bridge'
import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'

describe('installHistoryBridge', () => {
  it('posts a route event when pushState is called', () => {
    const spy = vi.spyOn(window, 'postMessage')
    installHistoryBridge(window)
    history.pushState({}, '', '/u/1969776354')
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'loveforxb', type: 'route-change' }),
      '*',
    )
  })
})

describe('findWeiboHostRegions', () => {
  it('finds the root region used for takeover', () => {
    document.body.innerHTML = `
      <main>
        <div data-testid="left"></div>
        <div class="woo-box-flex woo-box-alignCenter" data-testid="center"></div>
      </main>
    `
    expect(findWeiboHostRegions(document)?.contentRoot).toBeInstanceOf(HTMLElement)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- src/features/weibo/inject/install-history-bridge.test.ts src/features/weibo/content/host-selectors.test.ts`

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement message contracts, history patching, and selector fallbacks**

```ts
// src/features/weibo/platform/messages.ts
export const LOVEFORXB_SOURCE = 'loveforxb'
export const ROUTE_CHANGE_EVENT = 'route-change'

export interface RouteChangeMessage {
  source: typeof LOVEFORXB_SOURCE
  type: typeof ROUTE_CHANGE_EVENT
  href: string
}

export function isRouteChangeMessage(value: unknown): value is RouteChangeMessage {
  return typeof value === 'object'
    && value !== null
    && (value as RouteChangeMessage).source === LOVEFORXB_SOURCE
    && (value as RouteChangeMessage).type === ROUTE_CHANGE_EVENT
}
```

```ts
// src/features/weibo/inject/install-history-bridge.ts
import { LOVEFORXB_SOURCE, ROUTE_CHANGE_EVENT } from '@/features/weibo/platform/messages'

export function installHistoryBridge(targetWindow: Window) {
  const emit = () => {
    targetWindow.postMessage({
      source: LOVEFORXB_SOURCE,
      type: ROUTE_CHANGE_EVENT,
      href: targetWindow.location.href,
    }, '*')
  }

  const wrap = (key: 'pushState' | 'replaceState') => {
    const original = targetWindow.history[key]
    targetWindow.history[key] = function patched(...args) {
      const result = original.apply(this, args as never)
      emit()
      return result
    }
  }

  wrap('pushState')
  wrap('replaceState')
  targetWindow.addEventListener('popstate', emit)
}
```

```ts
// src/features/weibo/content/host-selectors.ts
export interface WeiboHostRegions {
  contentRoot: HTMLElement
}

const CONTENT_SELECTORS = [
  '[data-testid="mainCore"]',
  'main',
  '#app > div',
]

export function findWeiboHostRegions(root: ParentNode): WeiboHostRegions | null {
  for (const selector of CONTENT_SELECTORS) {
    const match = root.querySelector<HTMLElement>(selector)
    if (match) {
      return { contentRoot: match }
    }
  }
  return null
}
```

```ts
// src/entrypoints/weibo-main-world.ts
import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script'

import { installHistoryBridge } from '@/features/weibo/inject/install-history-bridge'

export default defineUnlistedScript(() => {
  installHistoryBridge(window)
})
```

- [ ] **Step 4: Run targeted tests**

Run: `pnpm test:unit -- src/features/weibo/inject/install-history-bridge.test.ts src/features/weibo/content/host-selectors.test.ts`

Expected: PASS with 2 passing test files.

Run: `pnpm compile`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/platform/messages.ts src/features/weibo/inject/install-history-bridge.ts src/entrypoints/weibo-main-world.ts src/features/weibo/content/host-selectors.ts src/features/weibo/inject/install-history-bridge.test.ts src/features/weibo/content/host-selectors.test.ts
git commit -m "feat: add weibo route bridge and host selectors"
```

## Task 3: Content Script Mount, ShadowRoot UI, and Router Sync

**Files:**
- Create: `src/features/weibo/content/page-takeover.ts`
- Create: `src/features/weibo/route/router-sync.ts`
- Create: `src/features/weibo/app/page-store.ts`
- Create: `src/features/weibo/app/app-root.tsx`
- Create: `src/features/weibo/app/app-shell.tsx`
- Create: `src/entrypoints/weibo.content.tsx`
- Modify: `src/assets/global.css`
- Modify: `wxt.config.ts`
- Test: `src/features/weibo/route/router-sync.test.ts`
- Test: `src/features/weibo/content/page-takeover.test.ts`

- [ ] **Step 1: Write failing tests for route sync and takeover fallback**

```tsx
import { describe, expect, it } from 'vitest'

import { applyPageTakeover, clearPageTakeover } from '@/features/weibo/content/page-takeover'
import { createRouteStore } from '@/features/weibo/route/router-sync'

describe('applyPageTakeover', () => {
  it('marks the original content root as hidden', () => {
    const node = document.createElement('div')
    applyPageTakeover(node)
    expect(node.dataset.loveforxbHidden).toBe('true')
    clearPageTakeover(node)
  })
})

describe('createRouteStore', () => {
  it('updates the descriptor from a route-change message', () => {
    const store = createRouteStore('https://weibo.com/')
    window.postMessage({ source: 'loveforxb', type: 'route-change', href: 'https://weibo.com/u/1969776354' }, '*')
    expect(store.getSnapshot()).toEqual({
      kind: 'profile',
      profileId: '1969776354',
      profileSource: 'u',
      tab: 'posts',
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:unit -- src/features/weibo/route/router-sync.test.ts src/features/weibo/content/page-takeover.test.ts`

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement the initial content shell**

```ts
// src/features/weibo/content/page-takeover.ts
export function applyPageTakeover(node: HTMLElement) {
  node.dataset.loveforxbHidden = 'true'
  node.setAttribute('aria-hidden', 'true')
  node.style.display = 'none'
}

export function clearPageTakeover(node: HTMLElement) {
  delete node.dataset.loveforxbHidden
  node.removeAttribute('aria-hidden')
  node.style.display = ''
}
```

```ts
// src/features/weibo/route/router-sync.ts
import { isRouteChangeMessage } from '@/features/weibo/platform/messages'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'

export function createRouteStore(initialHref: string) {
  let snapshot = parseWeiboUrl(initialHref)
  const listeners = new Set<() => void>()

  const onMessage = (event: MessageEvent) => {
    if (!isRouteChangeMessage(event.data)) return
    snapshot = parseWeiboUrl(event.data.href)
    listeners.forEach((listener) => listener())
  }

  window.addEventListener('message', onMessage)

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

```tsx
// src/features/weibo/app/page-store.ts
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'

export interface PageStore {
  getSnapshot: () => WeiboPageDescriptor
  subscribe: (listener: () => void) => () => void
}
```

```tsx
// src/features/weibo/app/app-root.tsx
import { useSyncExternalStore } from 'react'

import { AppShell } from '@/features/weibo/app/app-shell'
import { createRouteStore } from '@/features/weibo/route/router-sync'

const routeStore = createRouteStore(window.location.href)

export function AppRoot() {
  const page = useSyncExternalStore(routeStore.subscribe, routeStore.getSnapshot)
  return <AppShell page={page} />
}
```

```tsx
// src/features/weibo/app/app-shell.tsx
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'

export function AppShell({ page }: { page: WeiboPageDescriptor }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[88px_minmax(0,1fr)_320px] gap-4 px-4 py-4">
        <aside className="rounded-3xl border bg-card p-4">Nav</aside>
        <main className="rounded-3xl border bg-card p-4">{page.kind}</main>
        <aside className="rounded-3xl border bg-card p-4">Right rail</aside>
      </div>
    </div>
  )
}
```

```tsx
// src/entrypoints/weibo.content.tsx
import '@/assets/global.css'

import { createRoot } from 'react-dom/client'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { defineContentScript } from 'wxt/utils/define-content-script'
import { injectScript } from 'wxt/utils/inject-script'

import { AppRoot } from '@/features/weibo/app/app-root'
import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'
import { applyPageTakeover } from '@/features/weibo/content/page-takeover'

export default defineContentScript({
  matches: ['https://weibo.com/*', 'https://www.weibo.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await injectScript('/weibo-main-world.js', { keepInDom: true })
    const regions = findWeiboHostRegions(document)
    if (!regions) return
    applyPageTakeover(regions.contentRoot)

    const ui = await createShadowRootUi(ctx, {
      name: 'loveforxb-shell',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        const root = createRoot(container)
        root.render(<AppRoot />)
        return root
      },
      onRemove(root) {
        root?.unmount()
      },
    })

    ui.mount()
  },
})
```

```ts
// wxt.config.ts
manifest: {
  name: 'LoveForXb',
  description: 'LoveForXb rewrites weibo.com into a cleaner X-like reading experience',
  permissions: ['storage'],
  host_permissions: ['https://weibo.com/*', 'https://www.weibo.com/*'],
  web_accessible_resources: [
    {
      resources: ['weibo-main-world.js'],
      matches: ['https://weibo.com/*', 'https://www.weibo.com/*'],
    },
  ],
}
```

- [ ] **Step 4: Run tests and a build**

Run: `pnpm test:unit -- src/features/weibo/route/router-sync.test.ts src/features/weibo/content/page-takeover.test.ts`

Expected: PASS.

Run: `pnpm build`

Expected: PASS with a generated Weibo content script and the unlisted main-world script in `.output`.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/content/page-takeover.ts src/features/weibo/route/router-sync.ts src/features/weibo/app/page-store.ts src/features/weibo/app/app-root.tsx src/features/weibo/app/app-shell.tsx src/entrypoints/weibo.content.tsx src/assets/global.css wxt.config.ts src/features/weibo/route/router-sync.test.ts src/features/weibo/content/page-takeover.test.ts
git commit -m "feat: mount weibo shadow root shell"
```

## Task 4: Weibo Client, Endpoint Registry, and Timeline Adapters

**Files:**
- Create: `src/features/weibo/models/feed.ts`
- Create: `src/features/weibo/services/client.ts`
- Create: `src/features/weibo/services/endpoints.ts`
- Create: `src/features/weibo/services/adapters/timeline.ts`
- Create: `src/features/weibo/services/weibo-repository.ts`
- Test: `src/features/weibo/services/adapters/timeline.test.ts`

- [ ] **Step 1: Write a failing adapter test from captured timeline payload shapes**

```ts
import { describe, expect, it } from 'vitest'

import { adaptTimelineResponse } from '@/features/weibo/services/adapters/timeline'

const payload = {
  statuses: [
    {
      idstr: '501',
      text_raw: 'hello world',
      created_at: 'Tue Apr 08 10:00:00 +0800 2026',
      attitudes_count: 7,
      comments_count: 3,
      reposts_count: 1,
      user: {
        idstr: '1969776354',
        screen_name: 'Alice',
        avatar_hd: 'https://wx1.sinaimg.cn/large/avatar.jpg',
      },
    },
  ],
  max_id: '999',
}

describe('adaptTimelineResponse', () => {
  it('normalizes statuses into feed items', () => {
    expect(adaptTimelineResponse(payload)).toEqual({
      items: [
        expect.objectContaining({
          id: '501',
          text: 'hello world',
          author: expect.objectContaining({ id: '1969776354', name: 'Alice' }),
          stats: { likes: 7, comments: 3, reposts: 1 },
        }),
      ],
      nextCursor: '999',
    })
  })
})
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run: `pnpm test:unit -- src/features/weibo/services/adapters/timeline.test.ts`

Expected: FAIL because timeline adapter modules do not exist.

- [ ] **Step 3: Implement the client contract and first adapters**

```ts
// src/features/weibo/models/feed.ts
export interface FeedItem {
  id: string
  author: { id: string; name: string; avatarUrl: string | null }
  text: string
  createdAtLabel: string
  stats: { likes: number; comments: number; reposts: number }
}

export interface TimelinePage {
  items: FeedItem[]
  nextCursor: string | null
}
```

```ts
// src/features/weibo/services/endpoints.ts
export const WEIBO_ENDPOINTS = {
  forYou: '/ajax/feed/friendstimeline',
  following: '/ajax/feed/friendstimeline',
  sideCards: '/ajax/side/cards',
  statusDetail: '/ajax/statuses/show',
  profileInfo: '/ajax/profile/info',
  profilePosts: '/ajax/statuses/mymblog',
} as const
```

```ts
// src/features/weibo/services/client.ts
export async function fetchWeiboJson<T>(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(path, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  if (!response.ok) {
    throw new Error(`weibo-request-failed:${response.status}`)
  }
  return response.json() as Promise<T>
}
```

```ts
// src/features/weibo/services/adapters/timeline.ts
import type { TimelinePage } from '@/features/weibo/models/feed'

export function adaptTimelineResponse(payload: any): TimelinePage {
  const statuses = Array.isArray(payload?.statuses) ? payload.statuses : payload?.data?.list ?? []
  return {
    items: statuses.map((status: any) => ({
      id: String(status.idstr ?? status.mid),
      author: {
        id: String(status.user?.idstr ?? status.user?.id ?? ''),
        name: status.user?.screen_name ?? '',
        avatarUrl: status.user?.avatar_hd ?? status.user?.profile_image_url ?? null,
      },
      text: status.text_raw ?? status.raw_text ?? '',
      createdAtLabel: status.created_at ?? '',
      stats: {
        likes: Number(status.attitudes_count ?? 0),
        comments: Number(status.comments_count ?? 0),
        reposts: Number(status.reposts_count ?? 0),
      },
    })),
    nextCursor: String(payload?.max_id ?? payload?.data?.since_id ?? ''),
  }
}
```

- [ ] **Step 4: Run adapter tests and a compile**

Run: `pnpm test:unit -- src/features/weibo/services/adapters/timeline.test.ts`

Expected: PASS.

Run: `pnpm compile`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/models/feed.ts src/features/weibo/services/client.ts src/features/weibo/services/endpoints.ts src/features/weibo/services/adapters/timeline.ts src/features/weibo/services/weibo-repository.ts src/features/weibo/services/adapters/timeline.test.ts
git commit -m "feat: add weibo timeline client and adapters"
```

## Task 5: Home Timeline Page

**Files:**
- Create: `src/features/weibo/components/navigation-rail.tsx`
- Create: `src/features/weibo/components/feed-card.tsx`
- Create: `src/features/weibo/components/right-rail.tsx`
- Create: `src/features/weibo/components/page-state.tsx`
- Create: `src/features/weibo/pages/home-timeline-page.tsx`
- Modify: `src/features/weibo/app/app-shell.tsx`
- Test: `src/features/weibo/pages/home-timeline-page.test.tsx`

- [ ] **Step 1: Write a failing page render test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'

describe('HomeTimelinePage', () => {
  it('renders tabs and feed cards', () => {
    render(
      <HomeTimelinePage
        activeTab="for-you"
        page={{
          items: [
            {
              id: '501',
              text: 'hello world',
              createdAtLabel: 'just now',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 7, comments: 3, reposts: 1 },
            },
          ],
          nextCursor: null,
        }}
      />,
    )

    expect(screen.getByRole('tab', { name: 'For You' })).toBeInTheDocument()
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `pnpm test:unit -- src/features/weibo/pages/home-timeline-page.test.tsx`

Expected: FAIL because the page and component modules do not exist.

- [ ] **Step 3: Implement the X-like home page with shadcn primitives**

```tsx
// src/features/weibo/components/feed-card.tsx
import type { FeedItem } from '@/features/weibo/models/feed'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <Card className="rounded-3xl border-border/70 bg-card/90 shadow-none">
      <CardContent className="flex gap-3 p-4">
        <div className="size-11 rounded-full bg-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.author.name}</span>
            <Badge variant="secondary">{item.createdAtLabel}</Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{item.text}</p>
          <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
            <span>评论 {item.stats.comments}</span>
            <span>转发 {item.stats.reposts}</span>
            <span>点赞 {item.stats.likes}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

```tsx
// src/features/weibo/pages/home-timeline-page.tsx
import type { TimelinePage } from '@/features/weibo/models/feed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { FeedCard } from '@/features/weibo/components/feed-card'

export function HomeTimelinePage({
  activeTab,
  page,
}: {
  activeTab: 'for-you' | 'following'
  page: TimelinePage
}) {
  return (
    <Tabs value={activeTab} className="flex flex-col gap-4">
      <TabsList className="grid w-full grid-cols-2 rounded-full">
        <TabsTrigger value="for-you">For You</TabsTrigger>
        <TabsTrigger value="following">Following</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab} className="flex flex-col gap-3">
        {page.items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </TabsContent>
    </Tabs>
  )
}
```

```tsx
// src/features/weibo/app/app-shell.tsx
import type { TimelinePage } from '@/features/weibo/models/feed'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'

const mockTimelinePage: TimelinePage = {
  items: [
    {
      id: 'seed-home-card',
      text: 'LoveForXb home timeline seed item',
      createdAtLabel: 'now',
      author: { id: 'seed-user', name: 'LoveForXb', avatarUrl: null },
      stats: { likes: 0, comments: 0, reposts: 0 },
    },
  ],
  nextCursor: null,
}

if (page.kind === 'home') {
  return <HomeTimelinePage activeTab={page.tab} page={mockTimelinePage} />
}
```

- [ ] **Step 4: Run page tests and one manual smoke pass**

Run: `pnpm test:unit -- src/features/weibo/pages/home-timeline-page.test.tsx`

Expected: PASS.

Run: `pnpm dev`

Expected: WXT dev server starts; opening Weibo home shows the new three-column shell with tabs and feed cards.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/components/navigation-rail.tsx src/features/weibo/components/feed-card.tsx src/features/weibo/components/right-rail.tsx src/features/weibo/components/page-state.tsx src/features/weibo/pages/home-timeline-page.tsx src/features/weibo/app/app-shell.tsx src/features/weibo/pages/home-timeline-page.test.tsx
git commit -m "feat: add weibo home timeline page"
```

## Task 6: Status Detail Page

**Files:**
- Create: `src/features/weibo/models/status.ts`
- Create: `src/features/weibo/services/adapters/status.ts`
- Modify: `src/features/weibo/services/weibo-repository.ts`
- Create: `src/features/weibo/pages/status-detail-page.tsx`
- Modify: `src/features/weibo/app/app-shell.tsx`
- Test: `src/features/weibo/services/adapters/status.test.ts`
- Test: `src/features/weibo/pages/status-detail-page.test.tsx`

- [ ] **Step 1: Write failing adapter and page tests**

```ts
import { describe, expect, it } from 'vitest'

import { adaptStatusDetailResponse } from '@/features/weibo/services/adapters/status'

describe('adaptStatusDetailResponse', () => {
  it('returns a main status and replies list', () => {
    const result = adaptStatusDetailResponse({
      idstr: '501',
      text_raw: 'main post',
      user: { idstr: '1', screen_name: 'Alice' },
      comments: [{ idstr: '601', text_raw: 'reply', user: { idstr: '2', screen_name: 'Bob' } }],
    })

    expect(result.status.id).toBe('501')
    expect(result.replies).toHaveLength(1)
  })
})
```

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'

describe('StatusDetailPage', () => {
  it('renders the main post and replies', () => {
    render(
      <StatusDetailPage
        detail={{
          status: {
            id: '501',
            text: 'main post',
            createdAtLabel: 'today',
            author: { id: '1', name: 'Alice', avatarUrl: null },
            stats: { likes: 1, comments: 1, reposts: 0 },
          },
          replies: [
            {
              id: '601',
              text: 'reply',
              createdAtLabel: 'today',
              author: { id: '2', name: 'Bob', avatarUrl: null },
              stats: { likes: 0, comments: 0, reposts: 0 },
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('main post')).toBeInTheDocument()
    expect(screen.getByText('reply')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- src/features/weibo/services/adapters/status.test.ts src/features/weibo/pages/status-detail-page.test.tsx`

Expected: FAIL because status detail modules do not exist.

- [ ] **Step 3: Implement the detail adapter and page**

```ts
// src/features/weibo/models/status.ts
import type { FeedItem } from '@/features/weibo/models/feed'

export interface StatusDetail {
  status: FeedItem
  replies: FeedItem[]
}
```

```ts
// src/features/weibo/services/adapters/status.ts
import type { StatusDetail } from '@/features/weibo/models/status'

function toFeedItem(status: any) {
  return {
    id: String(status.idstr ?? status.mid),
    text: status.text_raw ?? '',
    createdAtLabel: status.created_at ?? '',
    author: {
      id: String(status.user?.idstr ?? status.user?.id ?? ''),
      name: status.user?.screen_name ?? '',
      avatarUrl: status.user?.avatar_hd ?? null,
    },
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
  }
}

export function adaptStatusDetailResponse(payload: any): StatusDetail {
  return {
    status: toFeedItem(payload),
    replies: Array.isArray(payload?.comments) ? payload.comments.map(toFeedItem) : [],
  }
}
```

```tsx
// src/features/weibo/pages/status-detail-page.tsx
import type { StatusDetail } from '@/features/weibo/models/status'

import { FeedCard } from '@/features/weibo/components/feed-card'

export function StatusDetailPage({ detail }: { detail: StatusDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <FeedCard item={detail.status} />
      {detail.replies.map((reply) => (
        <FeedCard key={reply.id} item={reply} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests and manual detail navigation**

Run: `pnpm test:unit -- src/features/weibo/services/adapters/status.test.ts src/features/weibo/pages/status-detail-page.test.tsx`

Expected: PASS.

Run: `pnpm dev`

Expected: Opening a status URL such as `https://weibo.com/<uid>/<bid>` renders the detail page instead of the generic placeholder shell.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/models/status.ts src/features/weibo/services/adapters/status.ts src/features/weibo/services/weibo-repository.ts src/features/weibo/pages/status-detail-page.tsx src/features/weibo/app/app-shell.tsx src/features/weibo/services/adapters/status.test.ts src/features/weibo/pages/status-detail-page.test.tsx
git commit -m "feat: add weibo status detail page"
```

## Task 7: Profile Page

**Files:**
- Create: `src/features/weibo/models/profile.ts`
- Create: `src/features/weibo/services/adapters/profile.ts`
- Modify: `src/features/weibo/services/weibo-repository.ts`
- Create: `src/features/weibo/pages/profile-page.tsx`
- Modify: `src/features/weibo/app/app-shell.tsx`
- Test: `src/features/weibo/services/adapters/profile.test.ts`
- Test: `src/features/weibo/pages/profile-page.test.tsx`

- [ ] **Step 1: Write failing profile tests**

```ts
import { describe, expect, it } from 'vitest'

import { adaptProfileInfoResponse } from '@/features/weibo/services/adapters/profile'

describe('adaptProfileInfoResponse', () => {
  it('normalizes user identity and bio fields', () => {
    const result = adaptProfileInfoResponse({
      data: {
        user: {
          idstr: '1969776354',
          screen_name: 'Alice',
          description: 'bio',
          avatar_hd: 'https://wx1.sinaimg.cn/large/avatar.jpg',
        },
      },
    })

    expect(result.id).toBe('1969776354')
    expect(result.name).toBe('Alice')
    expect(result.bio).toBe('bio')
  })
})
```

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProfilePage } from '@/features/weibo/pages/profile-page'

describe('ProfilePage', () => {
  it('renders the header and posts tab', () => {
    render(
      <ProfilePage
        profile={{ id: '1', name: 'Alice', bio: 'bio', avatarUrl: null, bannerUrl: null }}
        posts={{
          items: [
            {
              id: '501',
              text: 'profile post',
              createdAtLabel: 'today',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 1, comments: 1, reposts: 0 },
            },
          ],
          nextCursor: null,
        }}
        activeTab="posts"
      />,
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Posts' })).toBeInTheDocument()
    expect(screen.getByText('profile post')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- src/features/weibo/services/adapters/profile.test.ts src/features/weibo/pages/profile-page.test.tsx`

Expected: FAIL because the profile modules do not exist.

- [ ] **Step 3: Implement normalized profile data and page UI**

```ts
// src/features/weibo/models/profile.ts
export interface UserProfile {
  id: string
  name: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
}
```

```ts
// src/features/weibo/services/adapters/profile.ts
import type { UserProfile } from '@/features/weibo/models/profile'

export function adaptProfileInfoResponse(payload: any): UserProfile {
  const user = payload?.data?.user ?? payload?.user ?? {}
  return {
    id: String(user.idstr ?? user.id ?? ''),
    name: user.screen_name ?? '',
    bio: user.description ?? '',
    avatarUrl: user.avatar_hd ?? user.profile_image_url ?? null,
    bannerUrl: user.cover_image_phone ?? null,
  }
}
```

```tsx
// src/features/weibo/pages/profile-page.tsx
import type { TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { FeedCard } from '@/features/weibo/components/feed-card'

export function ProfilePage({
  profile,
  posts,
  activeTab,
}: {
  profile: UserProfile
  posts: TimelinePage
  activeTab: 'posts' | 'replies' | 'media'
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-3xl border bg-card">
        <div className="h-32 bg-muted" />
        <div className="flex flex-col gap-3 p-4">
          <div className="size-20 -mt-14 rounded-full border-4 border-background bg-muted" />
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        </div>
      </section>
      <Tabs value={activeTab} className="flex flex-col gap-4">
        <TabsList className="grid w-full grid-cols-3 rounded-full">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="flex flex-col gap-3">
          {posts.items.map((item) => <FeedCard key={item.id} item={item} />)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and manual profile navigation**

Run: `pnpm test:unit -- src/features/weibo/services/adapters/profile.test.ts src/features/weibo/pages/profile-page.test.tsx`

Expected: PASS.

Run: `pnpm dev`

Expected: Visiting `https://weibo.com/u/<uid>` renders the new profile header and posts list.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/models/profile.ts src/features/weibo/services/adapters/profile.ts src/features/weibo/services/weibo-repository.ts src/features/weibo/pages/profile-page.tsx src/features/weibo/app/app-shell.tsx src/features/weibo/services/adapters/profile.test.ts src/features/weibo/pages/profile-page.test.tsx
git commit -m "feat: add weibo profile page"
```

## Task 8: Settings, Dark Mode, and Original-Page Fallback

**Files:**
- Create: `src/features/weibo/settings/rewrite-settings.ts`
- Test: `src/features/weibo/settings/rewrite-settings.test.ts`
- Test: `src/features/weibo/app/app-shell.test.tsx`
- Modify: `src/features/weibo/app/app-root.tsx`
- Modify: `src/features/weibo/app/app-shell.tsx`
- Modify: `src/features/weibo/content/page-takeover.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing settings and fallback tests**

```ts
import { describe, expect, it } from 'vitest'

import { normalizeRewriteSettings } from '@/features/weibo/settings/rewrite-settings'

describe('normalizeRewriteSettings', () => {
  it('falls back to enabled rewrite and system appearance', () => {
    expect(normalizeRewriteSettings(undefined)).toEqual({
      enabled: true,
      appearance: 'system',
      fallbackToOriginal: false,
    })
  })
})
```

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'

describe('AppShell fallback button', () => {
  it('renders a control to show the original page', () => {
    render(<AppShell page={{ kind: 'home', tab: 'for-you' }} />)
    expect(screen.getByRole('button', { name: /show original/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- src/features/weibo/settings/rewrite-settings.test.ts src/features/weibo/app/app-shell.test.tsx`

Expected: FAIL because settings normalization and fallback controls do not exist yet.

- [ ] **Step 3: Implement persisted settings, theme sync, and page restore**

```ts
// src/features/weibo/settings/rewrite-settings.ts
export interface RewriteSettings {
  enabled: boolean
  appearance: 'system' | 'light' | 'dark'
  fallbackToOriginal: boolean
}

export const defaultRewriteSettings: RewriteSettings = {
  enabled: true,
  appearance: 'system',
  fallbackToOriginal: false,
}

export function normalizeRewriteSettings(value: unknown): RewriteSettings {
  const input = typeof value === 'object' && value ? value as Partial<RewriteSettings> : {}
  return {
    enabled: input.enabled !== false,
    appearance: input.appearance === 'light' || input.appearance === 'dark' ? input.appearance : 'system',
    fallbackToOriginal: input.fallbackToOriginal === true,
  }
}
```

```tsx
// src/features/weibo/app/app-shell.tsx
import { Button } from '@/components/ui/button'

export function AppShell({ page }: { page: WeiboPageDescriptor }) {
  const showOriginalPage = () => {
    const hidden = document.querySelector<HTMLElement>('[data-loveforxb-hidden="true"]')
    if (!hidden) return
    clearPageTakeover(hidden)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[88px_minmax(0,1fr)_320px] gap-4 px-4 py-4">
        <aside className="rounded-3xl border bg-card p-4">Nav</aside>
        <main className="rounded-3xl border bg-card p-4">
          <div className="mb-4 flex justify-end">
            <Button variant="outline" onClick={showOriginalPage}>
              Show Original Page
            </Button>
          </div>
          {page.kind}
        </main>
        <aside className="rounded-3xl border bg-card p-4">Right rail</aside>
      </div>
    </div>
  )
}
```

```ts
// src/features/weibo/content/page-takeover.ts
export function clearPageTakeover(node: HTMLElement) {
  delete node.dataset.loveforxbHidden
  node.removeAttribute('aria-hidden')
  node.style.display = ''
}
```

```md
<!-- README.md -->
LoveForXb rewrites `weibo.com` home, detail, and profile pages with a ShadowRoot-isolated React UI. Run `pnpm dev`, open `https://weibo.com/`, and use the in-app fallback button to restore the original page when needed.
```

- [ ] **Step 4: Run the full test suite and build**

Run: `pnpm test:unit`

Expected: PASS with all route, adapter, page, and settings tests passing.

Run: `pnpm compile`

Expected: PASS.

Run: `pnpm build`

Expected: PASS with a production extension bundle.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/settings/rewrite-settings.ts src/features/weibo/settings/rewrite-settings.test.ts src/features/weibo/app/app-shell.test.tsx src/features/weibo/app/app-root.tsx src/features/weibo/app/app-shell.tsx src/features/weibo/content/page-takeover.ts README.md
git commit -m "feat: add rewrite settings and fallback controls"
```

## Spec Coverage Check

- Home timeline rewrite: Task 4 and Task 5
- Status detail rewrite: Task 6
- Profile rewrite: Task 7
- ShadowRoot content app: Task 3
- Inject bridge and native URL sync: Task 2 and Task 3
- Direct Weibo API usage with adapters: Task 4, Task 6, Task 7
- Dark mode and original-page fallback: Task 8
- Test baseline and route coverage: Task 1, Task 2, Task 3
